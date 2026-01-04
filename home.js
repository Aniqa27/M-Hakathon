import { supabase } from "./config.js";

// DOM Elements
let currentUser = null;
let currentProfile = null;


// Check authentication and get user profile
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    await loadUserProfile();
    
    return user;
}

// Load user profile
async function loadUserProfile() {
    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
    }
    
    currentProfile = profile || {};
    
    // Display user info in navbar
    const userName = profile?.full_name || 
                    currentUser.user_metadata?.name || 
                    currentUser.email?.split('@')[0] || 
                    'User';
    
    document.getElementById('userEmail').textContent = userName;
    
    // Display avatar
    const avatarContainer = document.getElementById('userAvatar');
    if (!avatarContainer) {
        console.error('userAvatar element not found!');
        return;
    }
    
    if (profile?.avatar_url) {
        avatarContainer.innerHTML = `<img src="${profile.avatar_url}" alt="${userName}">`;
    } else {
        avatarContainer.innerHTML = `<i class="fas fa-user"></i>`;
    }
}

// Initialize Event Listeners
function initEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Edit Profile Button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            openProfileModal();
        });
    }

    // Create Post Button
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            document.getElementById('postId').value = '';
            document.getElementById('postTitle').value = '';
            document.getElementById('postCategory').value = '';
            document.getElementById('postContent').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('postImage').value = '';
            document.getElementById('deletePostBtn').style.display = 'none';
            document.getElementById('modalTitle').textContent = 'Create New Post';
            document.getElementById('submitBtnText').textContent = 'Publish Post';
            document.getElementById('postModal').style.display = 'flex';
        });
    }

    // Cancel Post
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    if (cancelPostBtn) {
        cancelPostBtn.addEventListener('click', () => {
            document.getElementById('postModal').style.display = 'none';
        });
    }

    // Close Post Details Modal
    const closeDetailsBtn = document.getElementById('closeDetails');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            document.getElementById('postDetailsModal').style.display = 'none';
        });
    }

    // Cancel Profile Edit
    const cancelProfileBtn = document.getElementById('cancelProfile');
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', () => {
            document.getElementById('profileModal').style.display = 'none';
        });
    }

    // Delete Post
    const deletePostBtn = document.getElementById('deletePostBtn');
    if (deletePostBtn) {
        deletePostBtn.addEventListener('click', async () => {
            const postId = document.getElementById('postId').value;
            if (!postId || !confirm('Are you sure you want to delete this post?')) return;

            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', currentUser.id);

            if (error) {
                alert('Error deleting post: ' + error.message);
            } else {
                alert('Post deleted successfully!');
                document.getElementById('postModal').style.display = 'none';
                loadPosts();
            }
        });
    }

    // Handle Post Form Submission
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }

    // Handle Profile Form Submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // Image Preview for Post
    const postImageInput = document.getElementById('postImage');
    if (postImageInput) {
        postImageInput.addEventListener('change', function(e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = '';
            
            if (this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Avatar Preview
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const preview = document.getElementById('currentAvatar');
            
            if (this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Avatar click to trigger file input
    const avatarLabel = document.querySelector('label[for="avatarInput"]');
    if (avatarLabel) {
        avatarLabel.addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Handle Post Form Submission
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitPostBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Processing...';

    const postId = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];

    let imageUrl = null;

    // Upload image if exists
    if (imageFile) {
        try {
            const fileName = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
            const { data, error } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile);
            
            if (!error) {
                const { data: urlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
            }
        } catch (error) {
            console.error('Image upload error:', error);
        }
    }

    // Prepare post data with user info
    const userDisplayName = currentProfile?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0];
    
    const postData = {
        user_id: currentUser.id,
        user_name: userDisplayName,
        title,
        content,
        category,
        image_url: imageUrl
    };

    let result;
    if (postId) {
        // Update existing post
        result = await supabase
            .from('posts')
            .update(postData)
            .eq('id', postId)
            .eq('user_id', currentUser.id);
    } else {
        // Create new post
        result = await supabase
            .from('posts')
            .insert([postData]);
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (result.error) {
        alert('Error saving post: ' + result.error.message);
    } else {
        alert(postId ? 'Post updated!' : 'Post published!');
        document.getElementById('postModal').style.display = 'none';
        loadPosts();
    }
}

// Handle Profile Form Submission
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Saving...';

    const fullName = document.getElementById('fullName').value;
    const bio = document.getElementById('userBio').value;
    const avatarFile = document.getElementById('avatarInput').files[0];

    let avatarUrl = currentProfile?.avatar_url;

    // Upload avatar if exists
    if (avatarFile) {
        try {
            const fileName = `avatars/${currentUser.id}_${Date.now()}`;
            const { data, error } = await supabase.storage
                .from('post-images')
                .upload(fileName, avatarFile, {
                    upsert: true
                });
            
            if (!error) {
                const { data: urlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                avatarUrl = urlData.publicUrl;
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
        }
    }

    // Update user metadata in auth
    await supabase.auth.updateUser({
        data: { name: fullName }
    });

    // Save to profiles table
    const profileData = {
        id: currentUser.id,
        full_name: fullName,
        bio: bio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (error) {
        alert('Error saving profile: ' + error.message);
    } else {
        alert('Profile updated successfully!');
        document.getElementById('profileModal').style.display = 'none';
        await loadUserProfile();
        loadPosts();
    }
}

// Open Profile Modal
function openProfileModal() {
    document.getElementById('fullName').value = currentProfile?.full_name || 
                                               currentUser.user_metadata?.name || 
                                               '';
    document.getElementById('userBio').value = currentProfile?.bio || '';
    
    const avatarImg = document.getElementById('currentAvatar');
    if (currentProfile?.avatar_url) {
        avatarImg.src = currentProfile.avatar_url;
    } else {
        // Default avatar SVG
        avatarImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="40" r="20" fill="%23ccc"/><path d="M30,85 Q50,65 70,85" fill="none" stroke="%23ccc" stroke-width="8"/></svg>';
    }
    
    document.getElementById('profileModal').style.display = 'flex';
}

// Load and Display Posts
async function loadPosts(category = 'all') {
    const postsGrid = document.getElementById('postsGrid');
    if (!postsGrid) {
        console.error('postsGrid element not found!');
        return;
    }
    
    postsGrid.innerHTML = `
        <div class="no-posts" id="emptyState">
            <i class="fas fa-newspaper fa-3x"></i>
            <h3>Loading posts...</h3>
        </div>
    `;

    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (category !== 'all') {
        query = query.eq('category', category);
    }

    const { data: posts, error } = await query;

    if (error) {
        postsGrid.innerHTML = '<div class="error">Error loading posts. Please refresh.</div>';
        console.error('Error:', error);
        return;
    }

    if (posts.length === 0) {
        postsGrid.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-newspaper fa-3x"></i>
                <h3>No posts yet</h3>
                <p>Be the first to create a post!</p>
                <button id="createFirstPost" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Create Your First Post
                </button>
            </div>
        `;
        
        // Add event listener for the create button
        setTimeout(() => {
            const createFirstBtn = document.getElementById('createFirstPost');
            if (createFirstBtn) {
                createFirstBtn.addEventListener('click', () => {
                    document.getElementById('createPostBtn').click();
                });
            }
        }, 100);
        
        return;
    }

    postsGrid.innerHTML = '';
    posts.forEach(post => {
        createPostCardElement(post, postsGrid);
    });
}

// Create Post Card Element
function createPostCardElement(post, container) {
    const isCurrentUser = currentUser && post.user_id === currentUser.id;
    
    // Get username
    const userName = post.user_name || 'User';
    
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    
    postCard.innerHTML = `
        ${post.image_url ? `
            <img src="${post.image_url}" alt="${post.title}" class="post-image">
        ` : ''}
        <div class="post-content">
            <span class="post-category">${post.category}</span>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-text">${post.content}</p>
            <div class="post-footer">
                <span class="post-author">
                    <i class="fas fa-user"></i> 
                    ${userName}
                    ${isCurrentUser ? ' (You)' : ''}
                </span>
                <span class="post-time">
                    <i class="far fa-clock"></i> 
                    ${formatDate(post.created_at)}
                </span>
                <div class="post-actions">
                    
                    ${isCurrentUser ? `
                        <button class="btn btn-secondary edit-post-btn" data-id="${post.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(postCard);
    
    // Add event listeners after the element is in DOM
    setTimeout(() => {
        // View Details Button
        const viewBtn = postCard.querySelector('.view-details-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewPostDetails(post.id);
            });
        }
        
        // Edit Button
        const editBtn = postCard.querySelector('.edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadPostForEdit(post.id);
            });
        }
        
        // Whole card click (for mobile/touch)
        postCard.addEventListener('click', (e) => {
            // Only trigger if not clicking on buttons
            if (!e.target.closest('.view-details-btn') && 
                !e.target.closest('.edit-post-btn')) {
                viewPostDetails(post.id);
            }
        });
    }, 10);
}

// View Post Details
async function viewPostDetails(postId) {
    console.log('Viewing post details for:', postId);
    
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (error) {
        console.error('Error loading post details:', error);
        alert('Error loading post details');
        return;
    }

    if (post) {
        // Get author profile
        let authorProfile = null;
        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', post.user_id)
                .single();
            authorProfile = profile;
        } catch (err) {
            console.log('No profile found for author');
        }
        
        const postDetailsContent = document.getElementById('postDetailsContent');
        postDetailsContent.innerHTML = `
            ${post.image_url ? `
                <img src="${post.image_url}" alt="${post.title}" class="post-details-image">
            ` : ''}
            <div class="post-details">
                <span class="post-details-category">${post.category}</span>
                <h1 class="post-details-title">${post.title}</h1>
                <div class="post-details-content">${post.content}</div>
                <div class="post-details-footer">
                    <div class="post-details-author">
                        <div class="author-avatar">
                            ${authorProfile?.avatar_url ? 
                                `<img src="${authorProfile.avatar_url}" alt="${post.user_name}">` :
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="author-info">
                            <h4>${post.user_name || 'User'}</h4>
                            <p>Posted ${formatDate(post.created_at)}</p>
                            ${authorProfile?.bio ? `<p>${authorProfile.bio}</p>` : ''}
                        </div>
                    </div>
                    ${currentUser && post.user_id === currentUser.id ? `
                        <button class="btn btn-primary edit-from-details" data-id="${post.id}">
                            <i class="fas fa-edit"></i> Edit Post
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Add edit button event if exists
        const editBtn = postDetailsContent.querySelector('.edit-from-details');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                document.getElementById('postDetailsModal').style.display = 'none';
                loadPostForEdit(post.id);
            });
        }
        
        // Show the modal
        document.getElementById('postDetailsModal').style.display = 'flex';
    }
}

// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// Load post for editing
async function loadPostForEdit(postId) {
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (!error && post) {
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postCategory').value = post.category;
        document.getElementById('postContent').value = post.content;
        
        const preview = document.getElementById('imagePreview');
        if (post.image_url) {
            preview.innerHTML = `<img src="${post.image_url}" alt="Current image">`;
        } else {
            preview.innerHTML = '';
        }

        document.getElementById('modalTitle').textContent = 'Edit Post';
        document.getElementById('submitBtnText').textContent = 'Update Post';
        document.getElementById('deletePostBtn').style.display = 'block';
        document.getElementById('postModal').style.display = 'flex';
    }
}

// Setup category filtering
function setupCategoryFilter() {
    const categories = ['all', 'Technology', 'Lifestyle', 'Food', 'Travel', 'Education'];
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    
    categories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = `category-tab ${category === 'all' ? 'active' : ''}`;
        tab.textContent = category === 'all' ? 'All Posts' : category;
        tab.dataset.category = category;
        
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadPosts(category);
        });
        
        container.appendChild(tab);
    });

    // Also handle nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadPosts(category);
        });
    });
}

// Initialize
async function init() {
    await checkAuth();
    initEventListeners();
    setupCategoryFilter();
    loadPosts();

    // Setup real-time updates
    supabase
        .channel('posts-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'posts' }, 
            () => {
                loadPosts();
            }
        )
        .subscribe();
}

// Start the app
init();