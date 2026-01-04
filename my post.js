import { supabase } from "./config.js";

// State variables
let currentUser = null;
let allPosts = [];
let selectedPosts = new Set();

// Initialize the app
async function init() {
    console.log("Initializing My Posts page...");
    
    // Check authentication
    currentUser = await checkAuth();
    if (!currentUser) return;
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user's posts
    await loadUserPosts();
    
    // Set up real-time updates
    setupRealtimeUpdates();
}

// Check authentication
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    // Display user email
    document.getElementById('userEmail').textContent = user.email;
    
    return user;
}

// Set up event listeners
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchPosts');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchPosts, 300));
    }
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterPosts);
    }
    
    // Sort filter
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', sortPosts);
    }
    
    // Cancel edit button
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.getElementById('editPostModal').style.display = 'none';
        });
    }
    
    // Edit post form submission
    const editPostForm = document.getElementById('editPostForm');
    if (editPostForm) {
        editPostForm.addEventListener('submit', handleEditPost);
    }
    
    // Delete post button
    const deletePostBtn = document.getElementById('deletePostBtn');
    if (deletePostBtn) {
        deletePostBtn.addEventListener('click', handleDeletePost);
    }
    
    // Bulk action buttons
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllPosts);
    }
    
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllPosts);
    }
    
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedPosts);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Image preview for edit modal
    const editPostImage = document.getElementById('editPostImage');
    if (editPostImage) {
        editPostImage.addEventListener('change', function(e) {
            const preview = document.getElementById('editImagePreview');
            preview.innerHTML = '';
            
            if (this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '200px';
                    img.style.borderRadius = '5px';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
}

// Load user's posts
async function loadUserPosts() {
    console.log("Loading user's posts for user:", currentUser.id);
    
    const postsGrid = document.getElementById('myPostsGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Show loading state
    postsGrid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <h3>Loading your posts...</h3>
        </div>
    `;
    
    try {
        // Fetch ONLY this user's posts
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', currentUser.id)  // CRITICAL: Filter by user_id
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching posts:', error);
            postsGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3>Error loading posts</h3>
                    <p>${error.message}</p>
                </div>
            `;
            return;
        }
        
        console.log(`Found ${posts?.length || 0} posts for user`);
        
        // Store all posts
        allPosts = posts || [];
        
        // Update statistics
        updateStatistics(allPosts);
        
        // Display posts or show empty state
        if (allPosts.length === 0) {
            postsGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            postsGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            displayPosts(allPosts);
        }
        
    } catch (error) {
        console.error('Unexpected error:', error);
        postsGrid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Connection Error</h3>
                <p>Please check your internet connection</p>
            </div>
        `;
    }
}

// Update statistics
function updateStatistics(posts) {
    const totalPosts = posts.length;
    
    // Calculate time since last post
    let lastPostTime = '-';
    if (posts.length > 0) {
        const lastPost = posts[0]; // Already sorted by newest first
        const now = new Date();
        const postDate = new Date(lastPost.created_at);
        const diffMs = now - postDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            lastPostTime = 'Today';
        } else if (diffDays === 1) {
            lastPostTime = 'Yesterday';
        } else {
            lastPostTime = `${diffDays} days ago`;
        }
    }
    
    // Update DOM
    document.getElementById('totalPosts').textContent = totalPosts;
    document.getElementById('lastPost').textContent = lastPostTime;
}

// Display posts in grid
function displayPosts(posts) {
    const postsGrid = document.getElementById('myPostsGrid');
    
    if (posts.length === 0) {
        postsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search fa-4x"></i>
                <h2>No posts found</h2>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `;
        return;
    }
    
    postsGrid.innerHTML = '';
    
    posts.forEach(post => {
        const postCard = createPostCard(post);
        postsGrid.appendChild(postCard);
    });
}

// Create post card element
function createPostCard(post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    
    // Format date
    const postDate = new Date(post.created_at);
    const formattedDate = postDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Create card HTML
    postCard.innerHTML = `
        <input type="checkbox" class="post-checkbox" data-post-id="${post.id}" style="display: none;">
        ${post.image_url ? `
            <img src="${post.image_url}" alt="${post.title}" class="post-image">
        ` : '<div class="post-image" style="background: #e9ecef; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image fa-3x" style="color: #adb5bd;"></i></div>'}
        <div class="post-content">
            <span class="post-category">${post.category || 'Uncategorized'}</span>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-text">${post.content}</p>
            <div class="post-footer">
                <span class="post-time">
                    <i class="far fa-calendar"></i> ${formattedDate}
                </span>
                <div class="post-actions">
                    <button class="btn btn-secondary edit-btn" data-post-id="${post.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary delete-btn" data-post-id="${post.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    setTimeout(() => {
        // Edit button
        const editBtn = postCard.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(post);
        });
        
        // Delete button
        const deleteBtn = postCard.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSinglePost(post.id);
        });
        
        // Card click for bulk selection
        const checkbox = postCard.querySelector('.post-checkbox');
        postCard.addEventListener('click', (e) => {
            if (!e.target.closest('button') && checkbox.style.display === 'block') {
                checkbox.checked = !checkbox.checked;
                updateBulkSelection(post.id, checkbox.checked);
            }
        });
    }, 10);
    
    return postCard;
}

// Open edit modal
function openEditModal(post) {
    console.log("Opening edit modal for post:", post.id);
    
    // Fill form with post data
    document.getElementById('editPostId').value = post.id;
    document.getElementById('editPostTitle').value = post.title;
    document.getElementById('editPostCategory').value = post.category || '';
    document.getElementById('editPostContent').value = post.content;
    
    // Display current image if exists
    const preview = document.getElementById('editImagePreview');
    if (post.image_url) {
        preview.innerHTML = `
            <p>Current image:</p>
            <img src="${post.image_url}" alt="Current" style="max-width: 200px; border-radius: 5px; margin-top: 5px;">
        `;
    } else {
        preview.innerHTML = '<p>No image uploaded</p>';
    }
    
    // Show modal
    document.getElementById('editPostModal').style.display = 'flex';
}

// Handle edit post submission
async function handleEditPost(e) {
    e.preventDefault();
    
    const postId = document.getElementById('editPostId').value;
    const title = document.getElementById('editPostTitle').value;
    const category = document.getElementById('editPostCategory').value;
    const content = document.getElementById('editPostContent').value;
    const imageFile = document.getElementById('editPostImage').files[0];
    
    // Validate
    if (!title.trim() || !category || !content.trim()) {
        alert('Please fill in all required fields.');
        return;
    }
    
    const updateBtn = document.getElementById('updatePostBtn');
    const originalText = updateBtn.innerHTML;
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        let imageUrl = null;
        
        // Upload new image if provided
        if (imageFile) {
            const fileName = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
            const { data, error } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile);
            
            if (error) throw error;
            
            const { data: urlData } = supabase.storage
                .from('post-images')
                .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }
        
        // Prepare update data
        const updateData = {
            title,
            category,
            content,
            updated_at: new Date().toISOString()
        };
        
        // Only update image if new one was uploaded
        if (imageUrl) {
            updateData.image_url = imageUrl;
        }
        
        // Update post in database
        const { error } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', postId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        alert('Post updated successfully!');
        document.getElementById('editPostModal').style.display = 'none';
        await loadUserPosts(); // Reload posts
        
    } catch (error) {
        console.error('Error updating post:', error);
        alert('Error updating post: ' + error.message);
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalText;
    }
}

// Handle delete single post
async function deleteSinglePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        alert('Post deleted successfully!');
        await loadUserPosts(); // Reload posts
        
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post: ' + error.message);
    }
}

// Handle delete post from modal
async function handleDeletePost() {
    const postId = document.getElementById('editPostId').value;
    
    if (!postId || !confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        alert('Post deleted successfully!');
        document.getElementById('editPostModal').style.display = 'none';
        await loadUserPosts(); // Reload posts
        
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post: ' + error.message);
    }
}

// Search posts
function searchPosts() {
    const searchTerm = document.getElementById('searchPosts').value.toLowerCase();
    
    if (!searchTerm) {
        displayPosts(allPosts);
        return;
    }
    
    const filtered = allPosts.filter(post => 
        post.title.toLowerCase().includes(searchTerm) || 
        post.content.toLowerCase().includes(searchTerm) ||
        (post.category && post.category.toLowerCase().includes(searchTerm))
    );
    
    displayPosts(filtered);
}

// Filter posts by category
function filterPosts() {
    const category = document.getElementById('categoryFilter').value;
    
    if (category === 'all') {
        displayPosts(allPosts);
        return;
    }
    
    const filtered = allPosts.filter(post => post.category === category);
    displayPosts(filtered);
}

// Sort posts
function sortPosts() {
    const sortBy = document.getElementById('sortFilter').value;
    let sorted = [...allPosts];
    
    switch (sortBy) {
        case 'newest':
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    displayPosts(sorted);
}

// Bulk selection functions
function selectAllPosts() {
    const checkboxes = document.querySelectorAll('.post-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedPosts.add(checkbox.dataset.postId);
    });
    updateBulkActions();
}

function deselectAllPosts() {
    const checkboxes = document.querySelectorAll('.post-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedPosts.clear();
    updateBulkActions();
}

function updateBulkSelection(postId, isSelected) {
    if (isSelected) {
        selectedPosts.add(postId);
    } else {
        selectedPosts.delete(postId);
    }
    updateBulkActions();
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    selectedCount.textContent = `${selectedPosts.size} posts selected`;
    
    if (selectedPosts.size > 0) {
        bulkActions.style.display = 'flex';
    } else {
        bulkActions.style.display = 'none';
    }
}

async function deleteSelectedPosts() {
    if (selectedPosts.size === 0 || !confirm(`Are you sure you want to delete ${selectedPosts.size} posts? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const postIds = Array.from(selectedPosts);
        const { error } = await supabase
            .from('posts')
            .delete()
            .in('id', postIds)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        alert(`${selectedPosts.size} posts deleted successfully!`);
        selectedPosts.clear();
        await loadUserPosts(); // Reload posts
        
    } catch (error) {
        console.error('Error deleting posts:', error);
        alert('Error deleting posts: ' + error.message);
    }
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Set up real-time updates
function setupRealtimeUpdates() {
    supabase
        .channel('my-posts-updates')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'posts',
                filter: `user_id=eq.${currentUser.id}`
            }, 
            () => {
                console.log('Real-time update detected, reloading posts...');
                loadUserPosts();
            }
        )
        .subscribe();
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);