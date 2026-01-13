async function renderServiceCard(provider, serviceKey) {
    try {
        const response = await fetch('service-card-template.html');
        if (!response.ok) throw new Error(`Failed to fetch template: ${response.statusText}`);
        const template = await response.text();

        const ratingValue = provider.rating || 0;
        const ratingDisplay = provider.rating ? parseFloat(provider.rating).toFixed(1) : 'N/A';
        const contact = provider.phone || provider.email || 'No contact';
        const address = provider.address || 'Poortjie';

        // Process Comments array into HTML
        // If provider.comments is undefined or empty, show a fallback message
        const commentsHtml = (provider.comments && provider.comments.length > 0)
            ? provider.comments.map(comment => `
                <div class="p-2 bg-gray-50 dark:bg-slate-700/50 rounded text-sm italic opacity-90 border-l-2 border-blue-400">
                    "${comment}"
                </div>
            `).join('')
            : `<p class="text-xs opacity-50 italic">No comments yet.</p>`;

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