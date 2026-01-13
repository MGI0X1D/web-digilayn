async function renderServiceCard(provider, serviceKey) {
    try {
        const response = await fetch('service-card-template.html');
        if (!response.ok) throw new Error(`Failed to fetch template: ${response.statusText}`);
        const template = await response.text();

        const ratingValue = provider.rating || 0;
        const ratingDisplay = provider.rating ? parseFloat(provider.rating).toFixed(1) : 'N/A';
        const contact = provider.phone || provider.email || 'No contact';
        const address = provider.address || 'Poortjie';

        // Process Ratings map into Comments HTML
        // Each entry in provider.ratings has {rating, comment, timestamp, likes}
        let commentsHtml = '';
        if (provider.ratings && Object.keys(provider.ratings).length > 0) {
            const currentUserId = firebase.auth().currentUser?.uid;

            const ratingEntries = Object.entries(provider.ratings)
                .map(([userId, r]) => ({ ...r, userId }))
                .filter(r => r.comment && r.comment.trim() !== '') // Only show ratings that have comments
                .sort((a, b) => {
                    // Sort by likes (desc) then timestamp (desc)
                    const likesA = a.likes ? Object.keys(a.likes).length : 0;
                    const likesB = b.likes ? Object.keys(b.likes).length : 0;
                    
                    if (likesB !== likesA) return likesB - likesA;

                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                    return timeB - timeA;
                });

            if (ratingEntries.length > 0) {
                commentsHtml = ratingEntries.map(r => {
                    const likesCount = r.likes ? Object.keys(r.likes).length : 0;
                    const isLiked = currentUserId && r.likes && r.likes[currentUserId];
                    const likeIconClass = isLiked ? 'fas fa-heart text-red-500' : 'far fa-heart';
                    
                    return `
                    <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm opacity-95 border-l-2 border-green-400 group relative">
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
        return cardElement.firstChild;

    } catch (error) {
        console.error("Error rendering service card:", error);
        return null;
    }
}