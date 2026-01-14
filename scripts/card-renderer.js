async function renderServiceCard(provider, serviceKey, sortOption = 'most-liked') {
    try {
        const response = await fetch('service-card-template.html');
        if (!response.ok) throw new Error(`Failed to fetch template: ${response.statusText}`);
        const template = await response.text();

        const ratingValue = provider.rating || 0;
        const ratingDisplay = provider.rating ? parseFloat(provider.rating).toFixed(1) : 'N/A';
        const contact = provider.phone || provider.email || 'No contact';
        const address = provider.address || 'Poortjie';

        // Process Ratings map into Comments HTML
        let commentsHtml = '';
        let hasMoreThanTwo = false;
        
        if (provider.ratings && Object.keys(provider.ratings).length > 0) {
            const currentUserId = firebase.auth().currentUser?.uid;

            const ratingEntries = Object.entries(provider.ratings)
                .map(([userId, r]) => ({ ...r, userId }))
                .filter(r => r.comment && r.comment.trim() !== '')
                .sort((a, b) => {
                    const likesA = a.likes ? Object.keys(a.likes).length : 0;
                    const likesB = b.likes ? Object.keys(b.likes).length : 0;
                    
                    if (sortOption === 'most-liked') {
                        if (likesB !== likesA) return likesB - likesA;
                    } else if (sortOption === 'least-liked') {
                        if (likesA !== likesB) return likesA - likesB;
                    }

                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                    return timeB - timeA;
                });

            if (ratingEntries.length > 0) {
                hasMoreThanTwo = ratingEntries.length > 2;
                // Initially show only 2 comments if more than 2 exist
                const displayedEntries = ratingEntries.slice(0, 5);
                
                commentsHtml = displayedEntries.map((r, index) => {
                    const likesCount = r.likes ? Object.keys(r.likes).length : 0;
                    const isLiked = currentUserId && r.likes && r.likes[currentUserId];
                    const likeIconClass = isLiked ? 'fas fa-heart text-red-500' : 'far fa-heart';
                    const hiddenClass = index >= 2 ? 'hidden extra-comment' : '';
                    
                    return `
                    <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm opacity-95 border-l-2 border-green-400 group relative ${hiddenClass}">
                        <div class="flex justify-between items-start mb-1">
                             <p class="italic">"${r.comment}"</p>
                             <button class="like-comment-btn flex items-center gap-1 text-xs transition-colors hover:text-red-500 ${isLiked ? 'text-red-500' : 'opacity-60'}" 
                                     data-comment-uid="${r.userId}" 
                                     data-service-id="${provider.id}" 
                                     data-service-key="${serviceKey}">
                                 <i class="${likeIconClass}"></i>
                                 <span class="likes-count">${likesCount}</span>
                             </button>
                        </div>
                    </div>
                `;}).join('');
            } else {
                commentsHtml = `<p class="text-xs opacity-50 italic">No comments yet.</p>`;
            }
        } else {
            commentsHtml = `<p class="text-xs opacity-50 italic">No comments yet.</p>`;
        }

        let cardHtml = template
            .replace(/{{businessName}}/g, provider.businessName)
            .replace(/{{subHeading}}/g, provider.subHeading)
            .replace(/{{ratingValue}}/g, ratingValue)
            .replace(/{{rating}}/g, ratingDisplay)
            .replace(/{{description}}/g, provider.description)
            .replace(/{{contact}}/g, contact)
            .replace(/{{address}}/g, address)
            .replace(/{{phone}}/g, provider.phone)
            .replace(/{{serviceId}}/g, provider.id)
            .replace(/{{serviceKey}}/g, serviceKey)
            .replace(/{{comments}}/g, commentsHtml);

        const cardElement = document.createElement('div');
        cardElement.innerHTML = cardHtml.trim();
        const firstChild = cardElement.firstChild;

        // Handle "Show More" visibility
        const showMoreBtn = firstChild.querySelector('.show-more-comments');
        if (showMoreBtn && hasMoreThanTwo) {
            showMoreBtn.classList.remove('hidden');
            showMoreBtn.addEventListener('click', () => {
                const extraComments = firstChild.querySelectorAll('.extra-comment');
                const isExpanded = showMoreBtn.querySelector('i').classList.contains('fa-chevron-up');
                
                extraComments.forEach(c => c.classList.toggle('hidden'));
                showMoreBtn.querySelector('i').className = isExpanded ? 'fas fa-chevron-down text-xs opacity-50' : 'fas fa-chevron-up text-xs opacity-50';
                
                if (!isExpanded) {
                    showMoreBtn.classList.remove('absolute', 'bottom-0', 'h-12', 'bg-gradient-to-t');
                    showMoreBtn.classList.add('mt-2');
                } else {
                    showMoreBtn.classList.add('absolute', 'bottom-0', 'h-12', 'bg-gradient-to-t');
                    showMoreBtn.classList.remove('mt-2');
                }
            });
        }

        // Handle Sort Change
        const sortSelect = firstChild.querySelector('.comment-sort-select');
        if (sortSelect) {
            sortSelect.value = sortOption;
            sortSelect.addEventListener('change', async (e) => {
                const newSort = e.target.value;
                const newCard = await renderServiceCard(provider, serviceKey, newSort);
                if (newCard) {
                    firstChild.replaceWith(newCard);
                }
            });
        }

        return firstChild;

    } catch (error) {
        console.error("Error rendering service card:", error);
        return null;
    }
}