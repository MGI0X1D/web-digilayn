document.addEventListener('DOMContentLoaded', () => {
    const ratingModal = document.getElementById('rating-modal');
    let serviceId, serviceKey, currentUser;
    let allComments = [];

    // --- Main Initialization ---
    const initializeModal = () => {
        // Attach listeners when the modal is ready
        document.getElementById('close-modal')?.addEventListener('click', closeModal);
        document.querySelectorAll('#star-rating .star').forEach(star => star.addEventListener('click', handleStarClick));
        document.getElementById('submit-rating')?.addEventListener('click', handleSubmit);
        document.getElementById('sort-comments')?.addEventListener('change', () => renderComments(allComments));

        // Listen for Firebase auth state changes
        firebase.auth().onAuthStateChanged(user => {
            currentUser = user;
        });
    };

    // --- Modal Control & Data Loading ---
    window.openRatingModal = async (sId, sKey) => {
        if (!currentUser) {
            window.location.href = '/authentication/login.html';
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

        const providerData = doc.data().homeScreen[serviceKey]?.data?.[serviceId];
        if (!providerData) {
            console.error(`Provider ${serviceId} not found in ${serviceKey}`);
            return;
        }

        // Load user's existing rating, if any
        const userRating = providerData.ratings?.[currentUser.uid];
        if (userRating) {
            updateStars(userRating.rating);
            document.getElementById('comment-input').value = userRating.comment || '';
            document.getElementById('submit-rating').textContent = 'Update Your Feedback';
        } else {
            resetUserRatingUI();
        }

        // Load all comments for the service
        allComments = providerData.ratings ? Object.entries(providerData.ratings).map(([userId, data]) => ({ userId, ...data })) : [];
        renderComments(allComments);
    };

    const closeModal = () => {
        ratingModal.classList.add('hidden');
        resetUserRatingUI();
    };

    // --- UI Rendering & Interaction ---
    const renderComments = (commentsToRender) => {
        const commentsList = document.getElementById('comments-list');
        const sortValue = document.getElementById('sort-comments').value;

        const sorted = [...commentsToRender].sort((a, b) => {
            switch (sortValue) {
                case 'likes': return (b.likes || 0) - (a.likes || 0);
                case 'rating_desc': return b.rating - a.rating;
                case 'rating_asc': return a.rating - b.rating;
                case 'date':
                default: return b.timestamp.toMillis() - a.timestamp.toMillis();
            }
        });

        commentsList.innerHTML = sorted.length > 0 ? sorted.map(c => `
            <div class="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-sm">Anonymous</span>
                        <div class="text-amber-500 text-xs">${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}</div>
                    </div>
                    <span class="text-xs text-slate-500 dark:text-slate-400">${new Date(c.timestamp.seconds * 1000).toLocaleDateString()}</span>
                </div>
                ${c.comment ? `<p class="text-sm text-slate-800 dark:text-slate-200 mb-2">${c.comment}</p>` : ''}
                <button class="like-btn text-blue-500 hover:text-blue-700 text-xs font-semibold" data-comment-id="${c.userId}">
                    Like (<span class="like-count">${c.likes || 0}</span>)
                </button>
            </div>
        `).join('') : '<p class="text-sm text-center text-slate-500">Be the first to comment!</p>';

        document.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', handleLikeClick));
    };

    const handleStarClick = (e) => {
        const rating = parseInt(e.currentTarget.dataset.value);
        updateStars(rating);
    };

    const updateStars = (rating) => {
        document.querySelectorAll('#star-rating .star').forEach(s => {
            s.classList.toggle('selected', parseInt(s.dataset.value) <= rating);
        });
        document.getElementById('submit-rating').disabled = false;
    };

    const resetUserRatingUI = () => {
        updateStars(0);
        document.getElementById('comment-input').value = '';
        document.getElementById('submit-rating').textContent = 'Submit';
        document.getElementById('submit-rating').disabled = true;
    };

    // --- Firestore Actions ---
    const handleSubmit = async () => {
        const rating = document.querySelectorAll('#star-rating .star.selected').length;
        const comment = document.getElementById('comment-input').value.trim();
        if (rating === 0) return;

        const serviceRef = db.collection('poortjie').doc('services');
        const ratingPath = `homeScreen.${serviceKey}.data.${serviceId}.ratings.${currentUser.uid}`;
        
        const updateData = {};
        updateData[`${ratingPath}.rating`] = rating;
        updateData[`${ratingPath}.comment`] = comment;
        updateData[`${ratingPath}.timestamp`] = firebase.firestore.FieldValue.serverTimestamp();

        await serviceRef.update(updateData);
        await updateOverallServiceRating();
        closeModal();
        alert('Thank you for your feedback!');
    };

    const handleLikeClick = async (e) => {
        const commentUserId = e.currentTarget.dataset.commentId;
        const serviceRef = db.collection('poortjie').doc('services');
        const likesPath = `homeScreen.${serviceKey}.data.${serviceId}.ratings.${commentUserId}.likes`;

        await serviceRef.update({
            [likesPath]: firebase.firestore.FieldValue.increment(1)
        });

        loadDataForModal(); // Refresh comments and likes
    };

    const updateOverallServiceRating = async () => {
        const serviceRef = db.collection('poortjie').doc('services');

        return db.runTransaction(async transaction => {
            const doc = await transaction.get(serviceRef);
            if (!doc.exists) return;

            const ratingsMap = doc.data().homeScreen[serviceKey].data[serviceId].ratings || {};
            const ratings = Object.values(ratingsMap);
            const totalRatings = ratings.length;
            const sumOfRatings = ratings.reduce((acc, r) => acc + r.rating, 0);
            const newAverage = totalRatings > 0 ? sumOfRatings / totalRatings : 0;

            const updatePayload = {};
            updatePayload[`homeScreen.${serviceKey}.data.${serviceId}.rating`] = newAverage;
            updatePayload[`homeScreen.${serviceKey}.data.${serviceId}.ratingCount`] = totalRatings;
            
            transaction.update(serviceRef, updatePayload);
        });
    };

    // Fetch the modal HTML and initialize
    fetch('rating-modal.html')
        .then(response => response.text())
        .then(html => {
            ratingModal.innerHTML = html;
            initializeModal();
        }).catch(error => console.error('Error fetching rating modal:', error));
});
