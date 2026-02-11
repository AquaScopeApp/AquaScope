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
from app.schemas.livestock import LivestockCreate, LivestockUpdate, LivestockResponse, LivestockSplitRequest, LivestockSplitResponse
from app.api.deps import get_current_user
from app.services.fishbase import fishbase_service
from app.services.worms import worms_service
from app.services.inaturalist import inaturalist_service

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

    Note: Species names with numbers (e.g., "Amphiprion ocellaris 5606")
    will be automatically cleaned to remove the trailing number.
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

    # Clean species name if it contains numbers
    data = livestock_in.model_dump()
    if data.get("species_name"):
        data["species_name"] = fishbase_service.clean_species_name(data["species_name"])

    livestock = Livestock(
        **data,
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
    include_archived: bool = Query(False, description="Include archived livestock"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List livestock (optionally filtered by tank or type)"""
    query = db.query(Livestock).filter(Livestock.user_id == current_user.id)

    if not include_archived:
        query = query.filter(Livestock.is_archived == False)

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

    # Auto-set removed_date when status changes to dead or removed
    if "status" in update_data and update_data["status"] in ("dead", "removed"):
        if not update_data.get("removed_date") and not livestock.removed_date:
            from datetime import date
            update_data["removed_date"] = date.today()

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


@router.post("/{livestock_id}/archive", response_model=LivestockResponse)
def archive_livestock(
    livestock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Archive livestock (hide from default list)."""
    livestock = db.query(Livestock).filter(Livestock.id == livestock_id, Livestock.user_id == current_user.id).first()
    if not livestock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livestock not found")
    livestock.is_archived = True
    db.commit()
    db.refresh(livestock)
    return livestock


@router.post("/{livestock_id}/unarchive", response_model=LivestockResponse)
def unarchive_livestock(
    livestock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unarchive livestock (restore to default list)."""
    livestock = db.query(Livestock).filter(Livestock.id == livestock_id, Livestock.user_id == current_user.id).first()
    if not livestock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livestock not found")
    livestock.is_archived = False
    db.commit()
    db.refresh(livestock)
    return livestock


@router.post("/{livestock_id}/split", response_model=LivestockSplitResponse)
def split_livestock(
    livestock_id: UUID,
    split_in: LivestockSplitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Split a livestock entry into two: keep some alive, mark others as dead/removed.

    Example: 3 Chromis viridis (alive) -> 2 alive + 1 dead.

    The original entry's quantity is reduced by split_quantity.
    A new entry is created copying all species data with the split_quantity and new status.
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

    if split_in.new_status not in ("dead", "removed"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="new_status must be 'dead' or 'removed'"
        )

    if split_in.split_quantity >= livestock.quantity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"split_quantity must be less than current quantity ({livestock.quantity}). Use regular update to change status of all."
        )

    # Reduce original quantity
    livestock.quantity = livestock.quantity - split_in.split_quantity

    # Create new entry copying species data from original
    from datetime import date as date_type
    new_entry = Livestock(
        tank_id=livestock.tank_id,
        user_id=livestock.user_id,
        species_name=livestock.species_name,
        common_name=livestock.common_name,
        type=livestock.type,
        fishbase_species_id=livestock.fishbase_species_id,
        worms_id=livestock.worms_id,
        inaturalist_id=livestock.inaturalist_id,
        cached_photo_url=livestock.cached_photo_url,
        quantity=split_in.split_quantity,
        status=split_in.new_status,
        added_date=livestock.added_date,
        removed_date=date_type.today(),
        notes=livestock.notes,
    )

    db.add(new_entry)
    db.commit()
    db.refresh(livestock)
    db.refresh(new_entry)

    return LivestockSplitResponse(original=livestock, split=new_entry)


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
    Example: /livestock/fishbase/search?query=Amphiprion ocellaris

    Note: Species names are automatically cleaned (numbers removed)
    """
    try:
        # Clean the query first
        clean_query = fishbase_service.clean_species_name(query)
        results = await fishbase_service.search_species(clean_query, limit)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching FishBase: {str(e)}"
        )


@router.get("/fishbase/validate")
async def validate_fishbase_species(
    species_name: str = Query(..., description="Species name to validate")
):
    """
    Validate if a species exists in FishBase.

    Returns match information or null if no match found.

    Example: /livestock/fishbase/validate?species_name=Amphiprion ocellaris
    """
    try:
        clean_name = fishbase_service.clean_species_name(species_name)
        results = await fishbase_service.search_species(clean_name, limit=1)

        if results and len(results) > 0:
            match = results[0]
            return {
                "found": True,
                "species_id": str(match.get("SpecCode", "")),
                "genus": match.get("Genus", ""),
                "species": match.get("Species", ""),
                "common_name": match.get("FBname", ""),
                "clean_name": clean_name
            }
        else:
            return {
                "found": False,
                "clean_name": clean_name,
                "message": "No match found in FishBase. This fish may not be in the database."
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating species: {str(e)}"
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


# WoRMS Endpoints

@router.get("/worms/search")
async def search_worms(
    query: str = Query(..., min_length=2, description="Species name to search"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results")
):
    """
    Search WoRMS for ANY marine species (fish, coral, invertebrate, algae).

    WoRMS (World Register of Marine Species) is the authoritative taxonomic database
    for marine organisms. Unlike FishBase, it covers ALL marine species.

    Example: /livestock/worms/search?query=Acropora (coral)
    Example: /livestock/worms/search?query=clownfish (fish)
    Example: /livestock/worms/search?query=hermit+crab (invertebrate)

    Returns species with:
    - AphiaID: Unique identifier
    - scientificname: Full scientific name
    - status: accepted, synonym, unaccepted
    - rank: Species, Genus, Family, etc.
    """
    try:
        results = await worms_service.search_species(query, limit)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching WoRMS: {str(e)}"
        )


@router.get("/worms/species/{aphia_id}")
async def get_worms_species(
    aphia_id: str,
    include_vernacular: bool = Query(False, description="Include common names in all languages")
):
    """
    Get detailed species information from WoRMS.

    Provides taxonomic classification, conservation status, habitat info.

    Example: /livestock/worms/species/275775
    Example: /livestock/worms/species/275775?include_vernacular=true
    """
    try:
        record = await worms_service.get_record_by_id(aphia_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Species not found in WoRMS"
            )

        # Optionally add vernacular names
        if include_vernacular:
            vernacular = await worms_service.get_vernacular_names(aphia_id)
            record["vernacular_names"] = vernacular

        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching from WoRMS: {str(e)}"
        )


# iNaturalist Endpoints

@router.get("/inaturalist/search")
async def search_inaturalist(
    query: str = Query(..., min_length=2, description="Species name to search"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results")
):
    """
    Search iNaturalist for species with photos.

    iNaturalist provides community-sourced photos and observations.
    Great for visual identification.

    Example: /livestock/inaturalist/search?query=Acropora
    Example: /livestock/inaturalist/search?query=clownfish

    Returns species with:
    - id: Taxon ID
    - name: Scientific name
    - preferred_common_name: Primary common name
    - default_photo: Photo with medium_url and square_url
    """
    try:
        results = await inaturalist_service.search_species(query, limit)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching iNaturalist: {str(e)}"
        )


@router.get("/inaturalist/species/{taxon_id}")
async def get_inaturalist_species(
    taxon_id: str
):
    """
    Get detailed taxon information from iNaturalist.

    Provides species info with photos, conservation status, distribution.

    Example: /livestock/inaturalist/species/47691
    """
    try:
        taxon = await inaturalist_service.get_taxon(taxon_id)
        if not taxon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Taxon not found in iNaturalist"
            )
        return taxon
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching from iNaturalist: {str(e)}"
        )


@router.get("/inaturalist/species/{taxon_id}/photos")
async def get_inaturalist_photos(
    taxon_id: str,
    limit: int = Query(10, ge=1, le=50, description="Maximum photos to return")
):
    """
    Get photos for a species from iNaturalist.

    Returns community-sourced photos with attribution.

    Example: /livestock/inaturalist/species/47691/photos
    """
    try:
        photos = await inaturalist_service.get_taxon_photos(taxon_id, limit)
        return photos
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching photos from iNaturalist: {str(e)}"
        )


# Unified Search Endpoint

@router.get("/species/search")
async def unified_species_search(
    query: str = Query(..., min_length=2, description="Species name to search"),
    sources: str = Query("worms,inaturalist", description="Comma-separated: worms,inaturalist,fishbase"),
    limit: int = Query(5, ge=1, le=20, description="Results per source")
):
    """
    Unified search across multiple species databases.

    Returns combined results from WoRMS, iNaturalist, and/or FishBase.
    Useful for comprehensive species lookup.

    Example: /livestock/species/search?query=clownfish&sources=worms,inaturalist
    Example: /livestock/species/search?query=Acropora&sources=worms,inaturalist,fishbase

    Default sources: worms,inaturalist (comprehensive coverage)
    """
    source_list = [s.strip() for s in sources.split(",")]
    results = {"query": query, "sources": {}}

    # Search WoRMS
    if "worms" in source_list:
        try:
            worms_results = await worms_service.search_species(query, limit)
            results["sources"]["worms"] = worms_results
        except Exception as e:
            results["sources"]["worms"] = {"error": str(e)}

    # Search iNaturalist
    if "inaturalist" in source_list:
        try:
            inat_results = await inaturalist_service.search_species(query, limit)
            results["sources"]["inaturalist"] = inat_results
        except Exception as e:
            results["sources"]["inaturalist"] = {"error": str(e)}

    # Search FishBase
    if "fishbase" in source_list:
        try:
            fishbase_results = await fishbase_service.search_species(query, limit)
            results["sources"]["fishbase"] = fishbase_results
        except Exception as e:
            results["sources"]["fishbase"] = {"error": str(e)}

    return results
