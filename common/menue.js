/**
 * PROJECT DARK v3.0.0
 * Developed by pheonix14
 * Pokémon 3-Color Theme Sidebar Menu Component
 */

function renderSidebarMenu() {
    let placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'sidebar-placeholder';
        document.body.appendChild(placeholder);
    }

    placeholder.innerHTML = `
        <div id="menu-overlay">
            <div class="menu-inner">
                <p class="menu-tag">◈ PROJECT DARK v3.0.0 ◈</p>
                <ul class="menu-nav">
                    <li><a href="/pages/index.html" onclick="closeMenu()"><span class="sym">◈</span>Home</a></li>
                    <li><a href="/pages/history.html" onclick="closeMenu()"><span class="sym">◉</span>Caught</a></li>
                    <li><a href="/pages/settings.html" onclick="closeMenu()"><span class="sym">◫</span>Settings</a></li>
                    <li><a href="/pages/interact.html" onclick="closeMenu()"><span class="sym">◎</span>Interact</a></li>
                    <li><a href="/pages/logs.html" onclick="closeMenu()"><span class="sym">⬡</span>Logs</a></li>
                    <li><a href="/pages/premium.html" onclick="closeMenu()"><span class="sym">★</span>Premium</a></li>
                    <li><a href="/pages/about.html" onclick="closeMenu()"><span class="sym">◈</span>About</a></li>
                </ul>
                <div class="menu-social">
                    <a href="#">dev by pheonix14</a>
                </div>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', renderSidebarMenu);
