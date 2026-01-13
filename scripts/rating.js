document.addEventListener('DOMContentLoaded', () => {
    const ratingModal = document.getElementById('rating-modal');
    let serviceIdToRate = null;
    let serviceKey = null; // This will hold the map key, e.g., "Creative", "Transport"
    let selectedRating = 0;

    // Fetch and inject the modal HTML from the services directory
    fetch('rating-modal.html')
        .then(response => response.text())
        .then(html => {
            if (ratingModal) {
                ratingModal.innerHTML = html;
                initializeModal();
            }
        }).catch(error => console.error('Error fetching rating modal:', error));

    const initializeModal = () => {
        const closeModalBtn = document.getElementById('close-modal');
        const stars = document.querySelectorAll('.star');
        const submitRatingBtn = document.getElementById('submit-rating');

        const resetStars = () => {
            if (stars && submitRatingBtn) {
                stars.forEach(star => star.classList.remove('selected'));
                selectedRating = 0;
                submitRatingBtn.disabled = true;
            }
        };

        // Open the modal and set the service context
        window.openRatingModal = (serviceId, key) => {
            serviceIdToRate = serviceId;
            serviceKey = key; // e.g., 'Creative', 'Home & Interior'
            ratingModal.classList.remove('hidden');
            resetStars();
        };

        const closeModal = () => {
            ratingModal.classList.add('hidden');
        };

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        // Star selection logic
        if (stars) {
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    selectedRating = parseInt(star.dataset.value);
                    stars.forEach(s => {
                        s.classList.toggle('selected', parseInt(s.dataset.value) <= selectedRating);
                    });
                    if (submitRatingBtn) {
                        submitRatingBtn.disabled = false;
                    }
                });
            });
        }

        // Submit the rating
        if (submitRatingBtn) {
            submitRatingBtn.addEventListener('click', async () => {
                if (selectedRating > 0 && serviceIdToRate && serviceKey) {
                    const servicesDocRef = db.collection('poortjie').doc('services');

                    try {
                        await db.runTransaction(async (transaction) => {
                            const servicesDoc = await transaction.get(servicesDocRef);
                            if (!servicesDoc.exists) {
                                throw "Services document does not exist!";
                            }

                            const providerData = servicesDoc.data().homeScreen[serviceKey].data[serviceIdToRate];
                            if (!providerData) {
                                throw `Provider with ID ${serviceIdToRate} not found in ${serviceKey}.`;
                            }

                            const currentRating = providerData.rating || 0;
                            const ratingCount = providerData.ratingCount || 0;

                            const newRatingCount = ratingCount + 1;
                            const newRating = ((currentRating * ratingCount) + selectedRating) / newRatingCount;

                            // Use dot notation to update the nested fields
                            const updateData = {};
                            updateData[`homeScreen.${serviceKey}.data.${serviceIdToRate}.rating`] = newRating;
                            updateData[`homeScreen.${serviceKey}.data.${serviceIdToRate}.ratingCount`] = newRatingCount;

                            transaction.update(servicesDocRef, updateData);
                        });

                        alert('Thank you for your rating!');
                        closeModal();
                        if (typeof fetchProviders === 'function') {
                            fetchProviders(); // Refresh the list to show the new rating
                        }
                    } catch (error) {
                        console.error("Error updating rating: ", error);
                        alert('Could not submit rating. Please try again.');
                    }
                }
            });
        }
    };
});
