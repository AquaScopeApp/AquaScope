/**
 * Tests for BannerEditor component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BannerEditor from '../banners/BannerEditor'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}))

const mockUpdateGeneralSettings = vi.fn().mockResolvedValue({})
const mockUploadBannerImage = vi.fn().mockResolvedValue({})

vi.mock('../../api', () => ({
  adminApi: {
    updateGeneralSettings: (...args: any[]) => mockUpdateGeneralSettings(...args),
    uploadBannerImage: (...args: any[]) => mockUploadBannerImage(...args),
  },
}))

const mockRefreshCurrency = vi.fn().mockResolvedValue(undefined)

vi.mock('../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    currency: 'EUR',
    bannerTheme: 'reef',
    isLoaded: true,
    refresh: mockRefreshCurrency,
  }),
}))

vi.mock('../../utils/cropImage', () => ({
  default: vi.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' })),
}))

// react-easy-crop: render a simple div and immediately call onCropComplete
vi.mock('react-easy-crop', () => ({
  default: (props: any) => {
    // Expose the onCropComplete to tests via a button
    return (
      <div data-testid="mock-cropper">
        <button
          data-testid="trigger-crop-complete"
          onClick={() =>
            props.onCropComplete?.(
              { x: 0, y: 0, width: 100, height: 100 },
              { x: 0, y: 0, width: 100, height: 100 },
            )
          }
        >
          Trigger Crop
        </button>
      </div>
    )
  },
}))

// Stub banner preview components
vi.mock('../banners/index', () => ({
  banners: {
    reef: () => <div data-testid="reef-preview">Reef Preview</div>,
    planted: () => <div data-testid="planted-preview">Planted Preview</div>,
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  currentTheme: 'reef' as const,
}

/**
 * Create a minimal File object suitable for the upload flow.
 */
function createImageFile(name = 'banner.jpg', size = 1024) {
  const content = new Uint8Array(size)
  return new File([content], name, { type: 'image/jpeg' })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BannerEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Open / Close
  // -------------------------------------------------------------------------

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<BannerEditor {...defaultProps} isOpen={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the dialog when isOpen is true', () => {
    render(<BannerEditor {...defaultProps} />)
    expect(screen.getByText('bannerEditor.title')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<BannerEditor {...defaultProps} onClose={onClose} />)
    const user = userEvent.setup()

    // The close X is the last button in the header with an SVG (M6 18L18 6M6 6l12 12)
    // It lives right after the title. We can locate it by finding the button with the close SVG.
    const buttons = screen.getAllByRole('button')
    // The close button is rendered in the header alongside the title
    // It contains the X path: M6 18L18 6M6 6l12 12
    const closeButton = buttons.find((btn) => {
      const svg = btn.querySelector('path[d*="M6 18L18 6"]')
      return svg !== null
    })
    expect(closeButton).toBeDefined()
    await user.click(closeButton!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<BannerEditor {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop overlay is clicked', async () => {
    const onClose = vi.fn()
    render(<BannerEditor {...defaultProps} onClose={onClose} />)
    const user = userEvent.setup()

    // The backdrop is the outermost fixed div
    const backdrop = screen.getByText('bannerEditor.title').closest('.fixed')!
    // Click exactly on the backdrop (not on the inner dialog card)
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Theme selection step
  // -------------------------------------------------------------------------

  it('shows the select step by default', () => {
    render(<BannerEditor {...defaultProps} />)
    // Title for the select step
    expect(screen.getByText('bannerEditor.title')).toBeInTheDocument()
    // Both theme previews are shown
    expect(screen.getByText('bannerEditor.reef')).toBeInTheDocument()
    expect(screen.getByText('bannerEditor.planted')).toBeInTheDocument()
    expect(screen.getByText('bannerEditor.custom')).toBeInTheDocument()
  })

  it('highlights the current theme on initial render', () => {
    render(<BannerEditor {...defaultProps} currentTheme="reef" />)
    // The reef theme button should have the selected border class
    const reefLabel = screen.getByText('bannerEditor.reef')
    const reefButton = reefLabel.closest('button')!
    expect(reefButton.className).toContain('border-ocean-500')
  })

  it('switches highlighted theme when a different theme is clicked', async () => {
    render(<BannerEditor {...defaultProps} currentTheme="reef" />)
    const user = userEvent.setup()

    const plantedLabel = screen.getByText('bannerEditor.planted')
    const plantedButton = plantedLabel.closest('button')!
    await user.click(plantedButton)

    // Now planted should be highlighted
    expect(plantedButton.className).toContain('border-ocean-500')

    // And reef should no longer be highlighted
    const reefLabel = screen.getByText('bannerEditor.reef')
    const reefButton = reefLabel.closest('button')!
    expect(reefButton.className).not.toContain('border-ocean-500')
  })

  // -------------------------------------------------------------------------
  // Save theme (non-custom)
  // -------------------------------------------------------------------------

  it('shows the Save Theme button for non-custom themes', () => {
    render(<BannerEditor {...defaultProps} currentTheme="reef" />)
    expect(screen.getByText('bannerEditor.saveTheme')).toBeInTheDocument()
  })

  it('shows the Cancel button for non-custom themes', () => {
    render(<BannerEditor {...defaultProps} currentTheme="reef" />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<BannerEditor {...defaultProps} onClose={onClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls adminApi.updateGeneralSettings and refreshCurrency when saving a theme', async () => {
    const onClose = vi.fn()
    render(<BannerEditor {...defaultProps} onClose={onClose} currentTheme="reef" />)
    const user = userEvent.setup()

    // Select planted
    await user.click(screen.getByText('bannerEditor.planted').closest('button')!)
    // Click Save Theme
    await user.click(screen.getByText('bannerEditor.saveTheme'))

    await waitFor(() => {
      expect(mockUpdateGeneralSettings).toHaveBeenCalledWith({ banner_theme: 'planted' })
    })
    await waitFor(() => {
      expect(mockRefreshCurrency).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows an alert when saving a theme fails', async () => {
    mockUpdateGeneralSettings.mockRejectedValueOnce(new Error('Network error'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.saveTheme'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to save banner theme')
    })

    alertSpy.mockRestore()
  })

  // -------------------------------------------------------------------------
  // Custom theme: upload area
  // -------------------------------------------------------------------------

  it('shows the upload area when custom theme is selected', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    expect(screen.getByText('bannerEditor.uploadPrompt')).toBeInTheDocument()
    expect(screen.getByText('bannerEditor.uploadHint')).toBeInTheDocument()
  })

  it('hides the footer buttons when custom theme is selected (before upload)', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    // Save Theme and Cancel should not be visible because the footer is conditional
    expect(screen.queryByText('bannerEditor.saveTheme')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('transitions to crop step when a valid image file is selected', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    // Select custom theme to reveal the upload area
    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    const file = createImageFile()
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('bannerEditor.cropTitle')).toBeInTheDocument()
    })
  })

  it('rejects non-image files with an alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const textFile = new File(['hello'], 'readme.txt', { type: 'text/plain' })
    // Use fireEvent.change because userEvent.upload respects the accept attribute
    // and silently skips files that don't match, so the onChange never fires.
    fireEvent.change(fileInput, { target: { files: [textFile] } })

    expect(alertSpy).toHaveBeenCalledWith('Please select an image file')
    // Should still be on the select step
    expect(screen.getByText('bannerEditor.title')).toBeInTheDocument()

    alertSpy.mockRestore()
  })

  it('rejects files larger than 10MB with an alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    // Create an oversized file (>10MB) - use Object.defineProperty to avoid
    // allocating a real 11MB buffer in the test.
    const bigFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    expect(alertSpy).toHaveBeenCalledWith('File size must be less than 10MB')

    alertSpy.mockRestore()
  })

  // -------------------------------------------------------------------------
  // Crop step
  // -------------------------------------------------------------------------

  it('shows the cropper, zoom slider, and action buttons in crop step', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    // Go to custom -> upload a file to reach crop step
    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, createImageFile())

    await waitFor(() => {
      expect(screen.getByTestId('mock-cropper')).toBeInTheDocument()
    })
    expect(screen.getByText('bannerEditor.zoom')).toBeInTheDocument()
    expect(screen.getByText('bannerEditor.back')).toBeInTheDocument()
    expect(screen.getByText('bannerEditor.saveBanner')).toBeInTheDocument()
  })

  it('navigates back to select step when the Back button is clicked', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, createImageFile())

    await waitFor(() => {
      expect(screen.getByText('bannerEditor.cropTitle')).toBeInTheDocument()
    })

    await user.click(screen.getByText('bannerEditor.back'))
    expect(screen.getByText('bannerEditor.title')).toBeInTheDocument()
  })

  it('navigates back to select step when the header back arrow is clicked', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, createImageFile())

    await waitFor(() => {
      expect(screen.getByText('bannerEditor.cropTitle')).toBeInTheDocument()
    })

    // The header back arrow is the button with the chevron SVG (M15 19l-7-7 7-7)
    const buttons = screen.getAllByRole('button')
    const backArrow = buttons.find((btn) => {
      const svg = btn.querySelector('path[d*="M15 19l-7-7 7-7"]')
      return svg !== null
    })
    expect(backArrow).toBeDefined()
    await user.click(backArrow!)

    expect(screen.getByText('bannerEditor.title')).toBeInTheDocument()
  })

  it('calls adminApi.uploadBannerImage when Save Banner is clicked after cropping', async () => {
    const onClose = vi.fn()
    render(<BannerEditor {...defaultProps} onClose={onClose} />)
    const user = userEvent.setup()

    // Navigate to custom -> upload -> crop step
    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, createImageFile())

    await waitFor(() => {
      expect(screen.getByTestId('mock-cropper')).toBeInTheDocument()
    })

    // Trigger the crop complete callback so croppedAreaPixels is set
    await user.click(screen.getByTestId('trigger-crop-complete'))

    // Now click Save Banner
    await user.click(screen.getByText('bannerEditor.saveBanner'))

    await waitFor(() => {
      expect(mockUploadBannerImage).toHaveBeenCalledTimes(1)
    })
    // The uploaded file should be a File object
    const uploadedFile = mockUploadBannerImage.mock.calls[0][0]
    expect(uploadedFile).toBeInstanceOf(File)
    expect(uploadedFile.name).toBe('banner.jpg')

    await waitFor(() => {
      expect(mockRefreshCurrency).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows an alert when uploading cropped image fails', async () => {
    mockUploadBannerImage.mockRejectedValueOnce(new Error('Upload failed'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, createImageFile())

    await waitFor(() => {
      expect(screen.getByTestId('mock-cropper')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('trigger-crop-complete'))
    await user.click(screen.getByText('bannerEditor.saveBanner'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to upload banner image')
    })

    alertSpy.mockRestore()
  })

  // -------------------------------------------------------------------------
  // Drag and drop
  // -------------------------------------------------------------------------

  it('handles drag-and-drop of an image file', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)

    const dropZone = screen.getByText('bannerEditor.uploadPrompt').closest('div[class*="border-dashed"]')!

    const file = createImageFile()
    const dataTransfer = {
      files: [file],
      types: ['Files'],
    }

    fireEvent.dragOver(dropZone, { dataTransfer })
    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByText('bannerEditor.cropTitle')).toBeInTheDocument()
    })
  })

  it('removes drag highlight on dragLeave', async () => {
    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.custom').closest('button')!)

    const dropZone = screen.getByText('bannerEditor.uploadPrompt').closest('div[class*="border-dashed"]')!

    // dragOver adds the highlight class
    fireEvent.dragOver(dropZone, { dataTransfer: { files: [], types: ['Files'] } })
    expect(dropZone.className).toContain('border-ocean-600')

    // dragLeave removes the highlight class
    fireEvent.dragLeave(dropZone)
    expect(dropZone.className).not.toContain('border-ocean-600')
  })

  // -------------------------------------------------------------------------
  // Saving state (button text changes)
  // -------------------------------------------------------------------------

  it('shows saving text on Save Theme button while request is in progress', async () => {
    // Make the API call hang so we can observe the saving state
    let resolveUpdate: () => void
    mockUpdateGeneralSettings.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveUpdate = resolve })
    )

    render(<BannerEditor {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('bannerEditor.saveTheme'))

    await waitFor(() => {
      expect(screen.getByText('bannerEditor.saving')).toBeInTheDocument()
    })

    // Resolve the pending request to clean up
    resolveUpdate!()
    await waitFor(() => {
      expect(screen.queryByText('bannerEditor.saving')).not.toBeInTheDocument()
    })
  })
})
