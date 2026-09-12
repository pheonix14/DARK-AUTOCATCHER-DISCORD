/**
 * PROJECT DARK v4.0.0
 * Developed by pheonix14
 * Pokémon 3-Color Theme Header Navigation Component
 */

function renderNavigationBar() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = `
        <nav id="navbar">
            <a href="/pages/index.html" class="logo">PROJECT DARK</a>
            <ul class="nav-links">
                <li><a href="/pages/index.html" data-symbol="◈">Home</a></li>
                <li><a href="/pages/history.html" data-symbol="◉">Caught</a></li>
                <li><a href="/pages/settings.html" data-symbol="◫">Settings</a></li>
                <li><a href="/pages/profiles.html" data-symbol="◇">Profiles</a></li>
                <li><a href="/pages/premium.html" data-symbol="◎">Premium</a></li>
            </ul>
            <div class="nav-right">
                <button class="notif-btn" onclick="requestNotif()" title="Enable notifications">
                    ◉
                    <div class="notif-dot"></div>
                </button>
                <button class="ham" id="ham" onclick="toggleMenu()">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </nav>
    `;
}

document.addEventListener('DOMContentLoaded', renderNavigationBar);
