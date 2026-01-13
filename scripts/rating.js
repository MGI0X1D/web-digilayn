document.addEventListener('DOMContentLoaded', () => {
    const ratingModal = document.getElementById('rating-modal');
    let serviceId, serviceKey, currentUser;
    let allComments = [];

    // --- Main Initialization ---
    const initializeModal = () => {
        // Use event delegation for the modal to handle dynamically loaded HTML
        document.body.addEventListener('click', (e) => {
            if (e.target.id === 'close-modal') closeModal();
            if (e.target.classList.contains('star')) handleStarClick(e);
            if (e.target.id === 'submit-rating') handleSubmit();
        });

        // Listen for Firebase auth state changes
        firebase.auth().onAuthStateChanged(user => {
            currentUser = user;
        });
    };

    // --- Modal Control & Data Loading ---
    window.openRatingModal = async (sId, sKey) => {
        if (!currentUser) {
            // Adjust path if your login page is elsewhere
            window.location.href = '../authentication/login.html';
            return;
        }
        serviceId = sId;
        serviceKey = sKey;

        ratingModal.classList.remove('hidden');
        await loadDataForModal();
    };

    const loadDataForModal = async () => {
        const serviceRef = db.collection('poortjie').doc('services');
        const doc = await serviceRef.get();

        if (!doc.exists) {
            console.error("Services document not found!");
            return;
        }

        const fullData = doc.data();
        const providerData = fullData.homeScreen[serviceKey]?.data?.[serviceId];

        if (!providerData) {
            console.error(`Provider ${serviceId} not found in ${serviceKey}`);
            return;
        }

        // 1. Check if CURRENT USER already has a rating
        const ratingsMap = providerData.ratings || {};
        const userExistingRating = ratingsMap[currentUser.uid];

        if (userExistingRating) {
            updateStarsUI(userExistingRating.rating);
            document.getElementById('comment-input').value = userExistingRating.comment || '';
            document.getElementById('submit-rating').textContent = 'Update Your Feedback';
            document.getElementById('submit-rating').disabled = false;
        } else {
            resetUserRatingUI();
        }

        // 2. Load all comments for display (filtering out empty comments if desired)
        allComments = Object.entries(ratingsMap).map(([userId, data]) => ({
            userId,
            ...data
        }));

        renderCommentsList(allComments);
    };

    const closeModal = () => {
        ratingModal.classList.add('hidden');
        resetUserRatingUI();
    };

    // --- UI Rendering ---
    const renderCommentsList = (commentsToRender) => {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return; // Guard if element doesn't exist in HTML

        // Sort by timestamp descending (newest first)
        const sorted = [...commentsToRender].sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        commentsList.innerHTML = sorted.length > 0 ? sorted.map(c => `
            <div class="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 mb-2">
                <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-sm">${c.userId === currentUser?.uid ? 'You' : 'Anonymous'}</span>
                        <div class="text-amber-500 text-xs">
                            ${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}
                        </div>
                    </div>
                </div>
                ${c.comment ? `<p class="text-sm text-slate-800 dark:text-slate-200 italic">"${c.comment}"</p>` : ''}
            </div>
        `).join('') : '<p class="text-sm text-center text-slate-500">No ratings yet.</p>';
    };

    const handleStarClick = (e) => {
        const rating = parseInt(e.target.dataset.value);
        updateStarsUI(rating);
    };

    const updateStarsUI = (rating) => {
        const stars = document.querySelectorAll('#star-rating .star');
        stars.forEach(s => {
            const val = parseInt(s.dataset.value);
            if (val <= rating) {
                s.classList.add('text-amber-500');
                s.classList.remove('text-slate-300', 'dark:text-slate-600');
            } else {
                s.classList.remove('text-amber-500');
                s.classList.add('text-slate-300', 'dark:text-slate-600');
            }
        });
        document.getElementById('submit-rating').disabled = false;
        document.getElementById('submit-rating').dataset.currentRating = rating;
    };

    const resetUserRatingUI = () => {
        updateStarsUI(0);
        const commentInput = document.getElementById('comment-input');
        const submitBtn = document.getElementById('submit-rating');
        if (commentInput) commentInput.value = '';
        if (submitBtn) {
            submitBtn.textContent = 'Submit';
            submitBtn.disabled = true;
            submitBtn.dataset.currentRating = 0;
        }
    };

    // --- Firestore Actions ---
    const handleSubmit = async () => {
        const submitBtn = document.getElementById('submit-rating');
        const rating = parseInt(submitBtn.dataset.currentRating);
        const comment = document.getElementById('comment-input').value.trim();

        if (!rating || rating === 0) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const serviceRef = db.collection('poortjie').doc('services');
        const basePath = `homeScreen.${serviceKey}.data.${serviceId}`;

        try {
            // Update the specific user's rating in the map
            const updatePayload = {};
            updatePayload[`${basePath}.ratings.${currentUser.uid}`] = {
                rating: rating,
                comment: comment,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await serviceRef.update(updatePayload);

            // Recalculate average and total count
            await updateOverallServiceRating(serviceId, serviceKey);

            closeModal();
            alert('Rating saved successfully!');
        } catch (error) {
            console.error("Error submitting rating:", error);
            alert('Failed to save rating. Try again.');
            submitBtn.disabled = false;
        }
    };

    const updateOverallServiceRating = async (sId, sKey) => {
        const serviceRef = db.collection('poortjie').doc('services');

        return db.runTransaction(async transaction => {
            const doc = await transaction.get(serviceRef);
            if (!doc.exists) return;

            const data = doc.data();
            const provider = data.homeScreen[sKey].data[sId];
            const ratingsMap = provider.ratings || {};

            const ratingsArray = Object.values(ratingsMap);
            const totalRatings = ratingsArray.length;
            const sumOfRatings = ratingsArray.reduce((acc, r) => acc + r.rating, 0);
            const newAverage = totalRatings > 0 ? (sumOfRatings / totalRatings) : 0;

            const updatePayload = {};
            updatePayload[`homeScreen.${sKey}.data.${sId}.rating`] = newAverage;
            updatePayload[`homeScreen.${sKey}.data.${sId}.ratingCount`] = totalRatings;

            transaction.update(serviceRef, updatePayload);
        });
    };

    // Initialize fetching the modal template
    fetch('rating-modal.html')
        .then(response => response.text())
        .then(html => {
            ratingModal.innerHTML = html;
            initializeModal();
        }).catch(error => console.error('Error fetching rating modal:', error));
});