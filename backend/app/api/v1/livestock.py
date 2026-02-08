"""
Livestock API Endpoints

Manages fish, coral, and invertebrate inventory with FishBase integration.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.livestock import Livestock
from app.schemas.livestock import LivestockCreate, LivestockUpdate, LivestockResponse
from app.api.deps import get_current_user
from app.services.fishbase import fishbase_service

router = APIRouter()


@router.post("/", response_model=LivestockResponse, status_code=status.HTTP_201_CREATED)
def add_livestock(
    livestock_in: LivestockCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add livestock to a tank.

    Types:
    - fish: Any fish species
    - coral: Hard and soft corals
    - invertebrate: Shrimp, snails, crabs, etc.
    """
    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == livestock_in.tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    livestock = Livestock(
        **livestock_in.model_dump(),
        user_id=current_user.id
    )
    db.add(livestock)
    db.commit()
    db.refresh(livestock)
    return livestock


@router.get("/", response_model=List[LivestockResponse])
def list_livestock(
    tank_id: UUID = Query(None, description="Filter by tank ID"),
    type: str = Query(None, description="Filter by type (fish, coral, invertebrate)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List livestock (optionally filtered by tank or type)"""
    query = db.query(Livestock).filter(Livestock.user_id == current_user.id)

    if tank_id:
        # Verify tank ownership
        tank = db.query(Tank).filter(
            Tank.id == tank_id,
            Tank.user_id == current_user.id
        ).first()
        if not tank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tank not found"
            )
        query = query.filter(Livestock.tank_id == tank_id)

    if type:
        query = query.filter(Livestock.type == type)

    livestock = query.order_by(Livestock.added_date.desc()).all()
    return livestock


@router.get("/{livestock_id}", response_model=LivestockResponse)
def get_livestock(
    livestock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific livestock details"""
    livestock = db.query(Livestock).filter(
        Livestock.id == livestock_id,
        Livestock.user_id == current_user.id
    ).first()

    if not livestock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livestock not found"
        )

    return livestock


@router.put("/{livestock_id}", response_model=LivestockResponse)
def update_livestock(
    livestock_id: UUID,
    livestock_in: LivestockUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update livestock information"""
    livestock = db.query(Livestock).filter(
        Livestock.id == livestock_id,
        Livestock.user_id == current_user.id
    ).first()

    if not livestock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livestock not found"
        )

    update_data = livestock_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(livestock, field, value)

    db.commit()
    db.refresh(livestock)
    return livestock


@router.delete("/{livestock_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_livestock(
    livestock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove livestock from tank.

    Use this when livestock is lost, sold, or moved to another tank.
    """
    livestock = db.query(Livestock).filter(
        Livestock.id == livestock_id,
        Livestock.user_id == current_user.id
    ).first()

    if not livestock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livestock not found"
        )

    db.delete(livestock)
    db.commit()
    return None


@router.get("/fishbase/search")
async def search_fishbase(
    query: str = Query(..., min_length=2, description="Species name to search"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results")
):
    """
    Search FishBase for fish species.

    Returns species information from FishBase API.
    Use this to find fishbase_species_id when adding fish.

    Example: /livestock/fishbase/search?query=clownfish
    """
    try:
        results = await fishbase_service.search_species(query, limit)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching FishBase: {str(e)}"
        )


@router.get("/fishbase/species/{species_id}")
async def get_fishbase_species(
    species_id: str,
    include_images: bool = Query(False, description="Include image URLs in response")
):
    """
    Get detailed species information from FishBase.

    Provides care requirements, max size, habitat, diet, etc.
    Optionally includes thumbnail image URL.
    """
    try:
        result = await fishbase_service.get_species_by_id(species_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Species not found in FishBase"
            )

        # Optionally add thumbnail
        if include_images:
            thumbnail = await fishbase_service.get_primary_image(species_id)
            if thumbnail:
                result["thumbnail"] = thumbnail

        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching from FishBase: {str(e)}"
        )


@router.get("/fishbase/species/{species_id}/images")
async def get_fishbase_species_images(
    species_id: str
):
    """
    Get all images/photos for a species from FishBase.

    Returns full-size and thumbnail URLs for all available photos.

    Example: /livestock/fishbase/species/5606/images
    """
    try:
        images = await fishbase_service.get_species_images(species_id)
        return images
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching images from FishBase: {str(e)}"
        )
