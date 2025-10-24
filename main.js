document.addEventListener('DOMContentLoaded', function () {
    // Global variables
    window.selectedImages = {};
    window.customizeImages = {};
    window.accessoryImages = {};
    window.selectedModelData = {
        quadCount: 1,
        boxModel: '2 model box',
        model: '2 model box'
    };
    let selectedImages = {};
    let currentIndex = 0;
    let quadCount = 1;
    let currentCustomizeSpot = null;
    let customizeImages = {};
    let selectedGlassColor = 'clear';
    let selectedFrameColor = 'black';
    let currentSection = 1;
    const totalSections = 4;
    let boxModel = "2 model box";
    let accessoryImages = {};
    let currentAccessorySide = null;
    let currentGalleryType = 'regular';

    // NEW: Track customization type for each quad
    let customizationType = {}; // Stores '4-touch' or '2-touch' for each quad

    // ADDED: Function to handle layout switching with confirmation
    function handleLayoutSwitch(newCard) {
        // Check if any images have been selected
        const hasSelectedImages = Object.keys(selectedImages).length > 0 ||
            Object.keys(customizeImages).length > 0 ||
            Object.keys(accessoryImages).length > 0;

        if (hasSelectedImages) {
            // Show confirmation dialog
            const userConfirmed = confirm("Switching layouts will reset all your current selections. Are you sure you want to continue?");

            if (!userConfirmed) {
                return false; // User canceled, don't switch layout
            }
        }

        // User confirmed or no images selected, proceed with layout switch
        document.querySelectorAll('.frame-card').forEach(c => c.classList.remove('active'));
        newCard.classList.add('active');
        quadCount = parseInt(newCard.getAttribute('data-count'));
        boxModel = newCard.getAttribute('data-model');

        // Reset all images and customization data
        selectedImages = {};
        customizeImages = {};
        accessoryImages = {};
        customizationType = {}; // NEW: Reset customization types

        // Hide customization options
        document.getElementById('customization-options').classList.remove('active');

        showPreview(quadCount);
        checkAllImagesSelected();

        return true;
    }

    // Navigation functions
    function showSection(sectionNumber) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(getSectionId(sectionNumber)).classList.add('active');
        currentSection = sectionNumber;

        if (sectionNumber === 4) {
            updateSummary();
        }
    }

    function getSectionId(sectionNumber) {
        switch (sectionNumber) {
            case 1: return 'frame-section';
            case 2: return 'glass-section';
            case 3: return 'frame-color-section';
            case 4: return 'summary-section';
            default: return 'frame-section';
        }
    }

    // Set up navigation buttons
    document.getElementById('next-btn-1').addEventListener('click', () => showSection(2));
    document.getElementById('prev-btn-2').addEventListener('click', () => showSection(1));
    document.getElementById('next-btn-2').addEventListener('click', () => showSection(3));
    document.getElementById('prev-btn-3').addEventListener('click', () => showSection(2));
    document.getElementById('next-btn-3').addEventListener('click', () => showSection(4));

    // Set up color selection
    document.querySelectorAll('.color-card').forEach(card => {
        card.addEventListener('click', () => {
            const parentSection = card.closest('.section').id;

            if (parentSection === 'glass-section') {
                document.querySelectorAll('#glass-section .color-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                if (card.classList.contains('custom-color-card')) {
                    // Handle custom color separately
                    const colorPicker = document.getElementById('custom-glass-color');
                    selectedGlassColor = colorPicker.value;
                } else {
                    selectedGlassColor = card.getAttribute('data-color');
                }
            } else if (parentSection === 'frame-color-section') {
                document.querySelectorAll('#frame-color-section .color-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedFrameColor = card.getAttribute('data-color');
            }
        });
    });

    // Listen for changes on the custom color picker
    const customColorPicker = document.getElementById('custom-glass-color');
    if (customColorPicker) {
        customColorPicker.addEventListener('input', () => {
            selectedGlassColor = customColorPicker.value;
            document.querySelectorAll('#glass-section .color-card').forEach(c => c.classList.remove('active'));
            document.querySelector('.custom-color-card').classList.add('active');
        });
    }

    // Update summary details - CORRECTED VERSION
    function updateSummary() {
        document.getElementById('summary-box-model').textContent = boxModel;

        // Count regular/custom quads vs accessory quads for frame type display
        let regularCustomCount = 0;
        let accessoryCount = 0;

        console.log('=== DEBUG: Checking selected images ===');
        for (let i = 0; i < quadCount; i++) {
            if (selectedImages[i]) {
                console.log(`Quad ${i + 1}: ID="${selectedImages[i].id}", Name="${selectedImages[i].name}"`);

                if (selectedImages[i].id === 'regular' || selectedImages[i].id === 'customize') {
                    regularCustomCount++;
                    console.log(`  → Counted as REGULAR/CUSTOM`);
                } else if (selectedImages[i].id === 'single-accessory' || selectedImages[i].id === 'double-accessory') {
                    accessoryCount++;
                    console.log(`  → Counted as ACCESSORY (blank)`);
                } else {
                    console.log(`  → UNKNOWN TYPE: ${selectedImages[i].id}`);
                }
            } else {
                console.log(`Quad ${i + 1}: No image selected → Counted as EMPTY (blank)`);
                accessoryCount++; // Count empty as blank too
            }
        }
        console.log('=== DEBUG RESULTS ===');
        console.log('Regular/Custom count:', regularCustomCount);
        console.log('Accessory/Empty count:', accessoryCount);

        // Format the frame type display
        let frameTypeText = '';
        if (regularCustomCount > 0 && accessoryCount > 0) {
            frameTypeText = `${regularCustomCount} quad + ${accessoryCount} blank`;
        } else if (regularCustomCount > 0) {
            frameTypeText = `${regularCustomCount} quad`;
        } else if (accessoryCount > 0) {
            frameTypeText = `${accessoryCount} blank`;
        } else {
            const activeFrameCard = document.querySelector('.frame-card.active');
            frameTypeText = activeFrameCard.querySelector('p').textContent; // Fallback to original text
        }

        console.log('Final Frame Type:', frameTypeText);
        document.getElementById('summary-frame-type').textContent = frameTypeText;

        const activeGlassCard = document.querySelector('#glass-section .color-card.active');
        if (activeGlassCard.classList.contains('custom-color-card')) {
            const colorValue = document.getElementById('custom-glass-color').value;
            document.getElementById('summary-glass-color').textContent = `Custom (${colorValue})`;
        } else {
            document.getElementById('summary-glass-color').textContent = activeGlassCard.querySelector('p').textContent;
        }

        const activeFrameColorCard = document.querySelector('#frame-color-section .color-card.active');
        document.getElementById('summary-frame-color').textContent = activeFrameColorCard.querySelector('p').textContent;

        let imageText = '';
        if (Object.keys(selectedImages).length > 0 || Object.keys(customizeImages).length > 0 || Object.keys(accessoryImages).length > 0) {
            for (let i = 0; i < quadCount; i++) {
                if (selectedImages[i]) {
                    if (selectedImages[i].id === 'customize') {
                        imageText += `Quad ${i + 1}: Customized with ${countCustomizeImages(i)} images\n`;
                    } else if (selectedImages[i].id === 'single-accessory') {
                        imageText += `Quad ${i + 1}: Single Accessory with ${countAccessoryImages(i)} images\n`;
                    } else if (selectedImages[i].id === 'double-accessory') {
                        imageText += `Quad ${i + 1}: ${selectedImages[i].name}\n`;
                    } else {
                        imageText += `Quad ${i + 1}: ${selectedImages[i].name}\n`;
                    }
                } else {
                    imageText += `Quad ${i + 1}: Blank\n`;
                }
            }
        } else {
            imageText = 'None selected';
        }
        document.getElementById('summary-images').textContent = imageText;

        updateFinalPreview();
    }
    function countCustomizeImages(quadIndex) {
        if (!customizeImages[quadIndex]) return 0;
        return Object.keys(customizeImages[quadIndex]).length;
    }

    function countAccessoryImages(quadIndex) {
        if (!accessoryImages[quadIndex]) return 0;
        return Object.keys(accessoryImages[quadIndex]).length;
    }

    function updateFinalPreview() {
        const finalPreviewBox = document.getElementById('final-preview-box');
        finalPreviewBox.innerHTML = '';
        finalPreviewBox.className = 'preview-box';

        if (quadCount === 1) finalPreviewBox.classList.add('frame-1');
        else if (quadCount === 2) finalPreviewBox.classList.add('frame-2');
        else if (quadCount === 3) finalPreviewBox.classList.add('frame-3');
        else if (quadCount === 6) finalPreviewBox.classList.add('frame-6');

        for (let i = 0; i < quadCount; i++) {
            const box = document.createElement('div');
            box.className = 'grey-box';
            box.dataset.index = i;

            if (selectedImages[i] && selectedImages[i].id === 'single-accessory') {
                box.classList.add('has-content');
                const accessorySplit = document.createElement('div');
                accessorySplit.className = 'accessory-split';

                const leftHalf = document.createElement('div');
                leftHalf.className = 'accessory-half left no-border';

                if (accessoryImages[i] && accessoryImages[i].left) {
                    const img = document.createElement('img');
                    img.src = accessoryImages[i].left;
                    leftHalf.appendChild(img);
                } else {
                    leftHalf.textContent = '+';
                }

                const rightHalf = document.createElement('div');
                rightHalf.className = 'accessory-half right no-border';

                if (accessoryImages[i] && accessoryImages[i].right) {
                    const img = document.createElement('img');
                    img.src = accessoryImages[i].right;
                    rightHalf.appendChild(img);
                } else {
                    rightHalf.textContent = '+';
                }

                accessorySplit.appendChild(leftHalf);
                accessorySplit.appendChild(rightHalf);
                box.appendChild(accessorySplit);
            }
            else if (selectedImages[i] && selectedImages[i].id === 'customize') {
                box.classList.add('has-content');
                const customizeGrid = document.createElement('div');

                // NEW: Apply the customization type
                const touchType = customizationType[i] || '4-touch';
                customizeGrid.className = `customize-grid ${touchType === '2-touch' ? 'two-touch' : ''}`;

                // Determine how many spots to show based on touch type
                const spotCount = touchType === '2-touch' ? 2 : 4;

                for (let j = 0; j < spotCount; j++) {
                    const spot = document.createElement('div');
                    spot.className = 'customize-spot';
                    spot.dataset.spotIndex = j;

                    if (customizeImages[i] && customizeImages[i][j]) {
                        const img = document.createElement('img');
                        img.src = customizeImages[i][j].src;
                        spot.appendChild(img);
                    } else {
                        const plusIcon = document.createElement('div');
                        plusIcon.className = 'plus-icon';
                        plusIcon.textContent = '+';
                        spot.appendChild(plusIcon);
                    }

                    customizeGrid.appendChild(spot);
                }

                box.appendChild(customizeGrid);
            } else if (selectedImages[i]) {
                box.classList.add('has-content');
                const img = document.createElement('img');
                img.src = selectedImages[i].src;
                box.appendChild(img);
            } else {
                box.textContent = `Quad ${i + 1}`;
            }

            finalPreviewBox.appendChild(box);
        }
    }

    // Print functionality
    document.getElementById('print-btn').addEventListener('click', function () {
        window.print();
    });

    // REPLACED: Frame card selection with confirmation
    document.querySelectorAll('.frame-card').forEach(card => {
        card.addEventListener('click', () => {
            // Only proceed if handleLayoutSwitch returns true (user confirmed)
            handleLayoutSwitch(card);
        });
    });

    function showPreview(count) {
        const layoutPreview = document.querySelector('.layout-preview');
        const previewBox = document.getElementById('preview-box');
        layoutPreview.classList.add('active');
        previewBox.innerHTML = '';
        previewBox.className = 'preview-box';

        if (count === 1) previewBox.classList.add('frame-1');
        else if (count === 2) previewBox.classList.add('frame-2');
        else if (count === 3) previewBox.classList.add('frame-3');
        else if (count === 6) previewBox.classList.add('frame-6');

        for (let i = 0; i < count; i++) {
            const box = document.createElement('div');
            box.className = 'grey-box';
            box.dataset.index = i;

            // Add restriction indicator for 6-quad layout
            if (count === 6) {
                if (i < 3) {
                    box.setAttribute('data-restriction', 'regular-customize');
                    box.title = 'Regular & Customize only';
                } else {
                    box.setAttribute('data-restriction', 'accessory-only');
                    box.title = 'Accessories only';
                }
            }

            if (selectedImages[i] && selectedImages[i].id === 'single-accessory') {
                box.classList.add('has-content');
                const accessorySplit = document.createElement('div');
                accessorySplit.className = 'accessory-split';

                const leftHalf = document.createElement('div');
                leftHalf.className = 'accessory-half left no-border';
                leftHalf.dataset.side = 'left';

                if (accessoryImages[i] && accessoryImages[i].left) {
                    const img = document.createElement('img');
                    img.src = accessoryImages[i].left;
                    leftHalf.appendChild(img);
                } else {
                    leftHalf.textContent = '+';
                    leftHalf.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentIndex = i;
                        currentAccessorySide = 'left';
                        currentGalleryType = 'single-accessory';
                        openImageModal();
                    });
                }

                const rightHalf = document.createElement('div');
                rightHalf.className = 'accessory-half right no-border';
                rightHalf.dataset.side = 'right';

                if (accessoryImages[i] && accessoryImages[i].right) {
                    const img = document.createElement('img');
                    img.src = accessoryImages[i].right;
                    rightHalf.appendChild(img);
                } else {
                    rightHalf.textContent = '+';
                    rightHalf.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentIndex = i;
                        currentAccessorySide = 'right';
                        currentGalleryType = 'single-accessory';
                        openImageModal();
                    });
                }

                accessorySplit.appendChild(leftHalf);
                accessorySplit.appendChild(rightHalf);
                box.appendChild(accessorySplit);
            }
            else if (selectedImages[i] && selectedImages[i].id === 'customize') {
                box.classList.add('has-content');
                const customizeGrid = document.createElement('div');

                // NEW: Apply the customization type
                const touchType = customizationType[i] || '4-touch';
                customizeGrid.className = `customize-grid ${touchType === '2-touch' ? 'two-touch' : ''}`;

                // Determine how many spots to show based on touch type
                const spotCount = touchType === '2-touch' ? 2 : 4;

                for (let j = 0; j < spotCount; j++) {
                    const spot = document.createElement('div');
                    spot.className = 'customize-spot';
                    spot.dataset.spotIndex = j;

                    if (customizeImages[i] && customizeImages[i][j]) {
                        const img = document.createElement('img');
                        img.src = customizeImages[i][j].src;
                        spot.appendChild(img);
                    } else {
                        const plusIcon = document.createElement('div');
                        plusIcon.className = 'plus-icon';
                        plusIcon.textContent = '+';
                        spot.appendChild(plusIcon);
                    }

                    spot.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentIndex = i;
                        currentCustomizeSpot = j;
                        currentGalleryType = 'customize';
                        openImageModal();
                    });

                    customizeGrid.appendChild(spot);
                }

                box.appendChild(customizeGrid);
            } else if (selectedImages[i]) {
                box.classList.add('has-content');
                const img = document.createElement('img');
                img.src = selectedImages[i].src;
                box.appendChild(img);
            } else {
                box.textContent = `Quad ${i + 1}`;
            }

            box.addEventListener('click', () => {
                currentIndex = parseInt(box.dataset.index);
                showImageSelection();
            });

            previewBox.appendChild(box);
        }
    }

    function showImageSelection() {
        const imageSelection = document.getElementById('image-selection');
        const imageOptions = document.getElementById('image-options');
        imageSelection.classList.add('active');
        imageOptions.innerHTML = '';

        // Filter options based on quad position for 6-quad layout
        let availableImages = [...sampleImages];

        if (quadCount === 6) {
            if (currentIndex < 3) {
                // First 3 quads (0, 1, 2) - Only Regular and Customize
                availableImages = sampleImages.filter(img =>
                    img.id === 'regular' || img.id === 'customize'
                );
                console.log(`Quad ${currentIndex + 1}: Regular/Customize only`);
            } else {
                // Last 3 quads (3, 4, 5) - Only Accessories
                availableImages = sampleImages.filter(img =>
                    img.id === 'single-accessory' || img.id === 'double-accessory'
                );
                console.log(`Quad ${currentIndex + 1}: Accessories only`);
            }
        }

        availableImages.forEach(image => {
            const option = document.createElement('div');
            option.className = 'image-option';
            if (selectedImages[currentIndex] && selectedImages[currentIndex].id === image.id) {
                option.classList.add('active');
            }

            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';

            if (image.src) {
                const img = document.createElement('img');
                img.src = image.src;
                placeholder.appendChild(img);
            } else {
                placeholder.textContent = '+';
            }

            option.appendChild(placeholder);

            const p = document.createElement('p');
            p.textContent = image.name;
            option.appendChild(p);

            option.addEventListener('click', () => {
                document.querySelectorAll('.image-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');

                if (image.id === 'customize') {
                    selectedImages[currentIndex] = image;
                    if (!customizeImages[currentIndex]) {
                        customizeImages[currentIndex] = {};
                    }
                    if (accessoryImages[currentIndex]) {
                        delete accessoryImages[currentIndex];
                    }

                    // Show customization options when customize is selected
                    document.getElementById('customization-options').classList.add('active');

                    // Set default customization type if not set
                    if (!customizationType[currentIndex]) {
                        customizationType[currentIndex] = '4-touch';
                    }
                } else if (image.id === 'single-accessory') {
                    selectedImages[currentIndex] = image;
                    if (!accessoryImages[currentIndex]) {
                        accessoryImages[currentIndex] = {};
                    }
                    if (customizeImages[currentIndex]) {
                        delete customizeImages[currentIndex];
                    }

                    // Hide customization options for non-customize selections
                    document.getElementById('customization-options').classList.remove('active');
                } else if (image.id === 'double-accessory') {
                    selectedImages[currentIndex] = image;
                    currentGalleryType = 'double-accessory';
                    openImageModal();

                    // Hide customization options for non-customize selections
                    document.getElementById('customization-options').classList.remove('active');
                } else {
                    selectedImages[currentIndex] = image;
                    currentGalleryType = 'regular';
                    openImageModal();

                    // Hide customization options for non-customize selections
                    document.getElementById('customization-options').classList.remove('active');
                }
                showPreview(quadCount);
                checkAllImagesSelected();
            });

            imageOptions.appendChild(option);
        });
    }
    // NEW: Set up touch option selection
    document.querySelectorAll('.touch-option').forEach(option => {
        option.addEventListener('click', function () {
            // Update active state
            document.querySelectorAll('.touch-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');

            // Update customization type for current quad
            const touchType = this.getAttribute('data-touch-type');
            customizationType[currentIndex] = touchType;

            // Update preview
            showPreview(quadCount);
        });
    });

    function openImageModal() {
        const modal = document.getElementById('image-modal');
        const galleryGrid = document.getElementById('gallery-grid');
        const uploadSection = document.getElementById('upload-section');

        // Set the active tab based on current gallery type
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.gallery === currentGalleryType) {
                tab.classList.add('active');
            }
        });

        // Show upload section only for customize gallery
        if (currentGalleryType === 'customize') {
            uploadSection.style.display = 'block';
        } else {
            uploadSection.style.display = 'none';
        }

        populateGallery(currentGalleryType);
        modal.classList.add('active');
    }

    function populateGallery(galleryType) {
        const galleryGrid = document.getElementById('gallery-grid');
        galleryGrid.innerHTML = '';

        const images = imageGalleries[galleryType];

        images.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            if (galleryType === 'single-accessory') {
                galleryItem.classList.add('single-accessory');
            }

            const img = document.createElement('img');
            img.src = image.src;
            img.className = 'gallery-image';
            galleryItem.appendChild(img);

            const p = document.createElement('p');
            p.textContent = image.name;
            galleryItem.appendChild(p);

            galleryItem.addEventListener('click', () => {
                document.querySelectorAll('.gallery-item').forEach(item => {
                    item.classList.remove('selected');
                });
                galleryItem.classList.add('selected');

                if (currentAccessorySide) {
                    const quadIndex = currentIndex;
                    const side = currentAccessorySide;

                    if (!accessoryImages[quadIndex]) {
                        accessoryImages[quadIndex] = {};
                    }

                    accessoryImages[quadIndex][side] = image.src;
                    currentAccessorySide = null;
                } else if (currentCustomizeSpot !== null) {
                    const quadIndex = currentIndex;
                    const spotIndex = currentCustomizeSpot;

                    if (!customizeImages[quadIndex]) {
                        customizeImages[quadIndex] = {};
                    }

                    customizeImages[quadIndex][spotIndex] = {
                        src: image.src,
                        name: image.name
                    };

                    currentCustomizeSpot = null;
                } else {
                    // FIXED: Use the galleryType as the id, not the individual image id
                    selectedImages[currentIndex] = {
                        id: galleryType,  // ← This is the fix! Use galleryType instead of image.id
                        src: image.src,
                        name: image.name
                    };
                }

                showPreview(quadCount);
                document.getElementById('image-modal').classList.remove('active');
                checkAllImagesSelected();
            });

            galleryGrid.appendChild(galleryItem);
        });
    }
    // Tab switching in modal
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentGalleryType = tab.dataset.gallery;
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show upload section only for customize gallery
            const uploadSection = document.getElementById('upload-section');
            if (currentGalleryType === 'customize') {
                uploadSection.style.display = 'block';
            } else {
                uploadSection.style.display = 'none';
            }

            populateGallery(currentGalleryType);
        });
    });

    // Close modal when clicking the X button
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('image-modal').classList.remove('active');
        currentAccessorySide = null;
        currentCustomizeSpot = null;
    });

    // Upload functionality - only for customize gallery
    document.getElementById('upload-trigger').addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });

    document.getElementById('file-upload').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // ✅ Check file type
        if (file.type !== 'image/png') {
            alert('Only PNG images are allowed.');
            e.target.value = '';
            return;
        }

        const img = new Image();
        img.onload = function () {
            if (img.width !== img.height) {
                alert('Only perfect square images in png formats are allowed. Please upload a square image (e.g., 512x512).');
                e.target.value = '';
                return;
            }

            // ✅ Continue with upload if valid
            const reader = new FileReader();
            reader.onload = function (event) {
                const uploadedImage = {
                    id: 'uploaded-' + Date.now(),
                    src: event.target.result,
                    name: 'Uploaded Image'
                };

                if (currentCustomizeSpot !== null) {
                    const quadIndex = currentIndex;
                    const spotIndex = currentCustomizeSpot;

                    if (!customizeImages[quadIndex]) {
                        customizeImages[quadIndex] = {};
                    }

                    customizeImages[quadIndex][spotIndex] = {
                        src: uploadedImage.src,
                        name: uploadedImage.name
                    };

                    currentCustomizeSpot = null;
                }

                showPreview(quadCount);
                document.getElementById('image-modal').classList.remove('active');
                checkAllImagesSelected();
            };
            reader.readAsDataURL(file);
        };
        img.src = URL.createObjectURL(file);
    });

    // Initialize with default frame
    showPreview(quadCount);

    // Check if all images are selected to enable the next button
    function checkAllImagesSelected() {
        const nextBtn1 = document.getElementById('next-btn-1');
        let allSelected = true;

        for (let i = 0; i < quadCount; i++) {
            if (!selectedImages[i]) {
                allSelected = false;
                break;
            }
        }

        nextBtn1.disabled = !allSelected;
    }

    // Highlight selected grey box in preview correctly
    document.addEventListener('click', function (e) {
        const box = e.target.closest('.grey-box');
        if (!box) return;

        document.querySelectorAll('.preview-box .grey-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        currentIndex = parseInt(box.dataset.index);
    });
});

// --- Save Design Feature ---
document.getElementById('saveDesignBtn').addEventListener('click', () => {
    // Get current date and time
    const now = new Date();

    // Format date as DD-MM-YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();

    // Format time as HH:MM-AM/PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    // Create the formatted file name
    const fileName = `${day}-${month}-${year}/${hours}:${minutes}-${ampm}`;

    // Get current configuration data
    const quadCount = window.selectedModelData?.quadCount ||
        parseInt(document.querySelector('.frame-card.active')?.getAttribute('data-count') || 1);

    const designData = {
        id: 'design_' + Date.now(),
        fileName: fileName, // Add the formatted file name
        model: document.getElementById('summary-box-model').textContent,
        frameType: document.getElementById('summary-frame-type').textContent,
        glassColor: document.getElementById('summary-glass-color').textContent,
        frameColor: document.getElementById('summary-frame-color').textContent,
        layoutClass: document.getElementById('final-preview-box').className.replace('preview-box ', ''),
        previewHTML: document.getElementById('final-preview-box').outerHTML,
        images: getEnhancedImageData(quadCount),
        timestamp: new Date().toISOString()
    };

    let designs = JSON.parse(localStorage.getItem('myDesigns') || '[]');
    designs.push(designData);
    localStorage.setItem('myDesigns', JSON.stringify(designs));
    alert('Configurator saved successfully! Check the gear icon ⚙️ in top right corner for your design.');
});

// Helper function to get complete image data
function getEnhancedImageData(quadCount) {
    const images = [];

    for (let i = 0; i < quadCount; i++) {
        const imgData = {
            quadIndex: i,
            type: window.selectedImages?.[i]?.id || 'empty'
        };

        if (window.selectedImages?.[i]?.id === 'customize' && window.customizeImages?.[i]) {
            imgData.customizeImages = {};
            Object.keys(window.customizeImages[i]).forEach(spotIndex => {
                imgData.customizeImages[spotIndex] = window.customizeImages[i][spotIndex].src;
            });
        } else if (window.selectedImages?.[i]?.id === 'single-accessory' && window.accessoryImages?.[i]) {
            imgData.accessoryImages = window.accessoryImages[i];
        } else if (window.selectedImages?.[i]?.src) {
            imgData.src = window.selectedImages[i].src;
            imgData.name = window.selectedImages[i].name;
        }

        images.push(imgData);
    }

    return images;
}

// --- Navigate to My Designs page ---
document.getElementById('myDesignsBtn').addEventListener('click', () => {
    window.location.href = 'my-designs.html';
});

// Print functionality with timestamp
document.getElementById('print-btn').addEventListener('click', function () {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 0-indexed months
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    // Format like "22-10-2025/12:52-pm"
    const formattedDateTime = `${day}-${month}-${year})(${hours}-${minutes}-${ampm}`;

    // Update the document title
    document.title = `Lumi Configurator - (${formattedDateTime})`;

    // Trigger print
    window.print();
});