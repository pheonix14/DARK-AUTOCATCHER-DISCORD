/**
 * PROJECT DARK v4.0.0
 * Developed by rayzien
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
            <button onclick="toggleMenu()" style="position:absolute; top:30px; right:30px; background:none; border:1px solid rgba(255,255,255,0.3); color:#fff; font-size:20px; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:100; transition:all 0.3s;" onmouseover="this.style.borderColor='var(--c1)'; this.style.color='var(--c1)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.3)'; this.style.color='#fff';">✕</button>
            <div class="menu-inner" style="position:relative;">
                <p class="menu-tag">◈ PROJECT DARK v4.0.0 ◈</p>
                <ul class="menu-nav">
                    <li><a href="/pages/index.html" onclick="closeMenu()"><span class="sym">◈</span>Home</a></li>
                    <li><a href="/pages/history.html" onclick="closeMenu()"><span class="sym">◉</span>Caught</a></li>
                    <li><a href="/pages/profiles.html" onclick="closeMenu()"><span class="sym">👥</span>Profiles</a></li>
                    <li><a href="/pages/settings.html" onclick="closeMenu()"><span class="sym">◫</span>Settings</a></li>
                    <li><a href="/pages/interact.html" onclick="closeMenu()"><span class="sym">◎</span>Interact</a></li>
                    <li><a href="/pages/logs.html" onclick="closeMenu()"><span class="sym">⬡</span>Logs</a></li>
                    <li><a href="/pages/premium.html" onclick="closeMenu()"><span class="sym">★</span>Premium</a></li>
                    <li><a href="/pages/about.html" onclick="closeMenu()"><span class="sym">◈</span>About</a></li>
                </ul>
                <div class="menu-social">
                    <a href="#">dev by rayzien</a><br>
                    <a href="/pages/premium.html" style="color:var(--c2); font-size:12px; margin-top:5px; display:inline-block;">★ Buy Premium to Support!</a>
                </div>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', renderSidebarMenu);
