import re

file_path = r"c:\Users\gab\Desktop\Progetti_Personali\FestaDelloSport_\app\static\js\script.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove MENU CATEGORY TABS block
# It starts with // ===== MENU CATEGORY TABS =====
# Ends before // ===== EVENT DAY TABS =====
content = re.sub(
    r'// ===== MENU CATEGORY TABS =====.*?// ===== EVENT DAY TABS =====', 
    '// ===== EVENT DAY TABS =====', 
    content, 
    flags=re.DOTALL
)

# 2. Remove EVENT DAY TABS block
# It starts with // ===== EVENT DAY TABS =====
# Ends before // ===== RATING STARS =====
content = re.sub(
    r'// ===== EVENT DAY TABS =====.*?// ===== RATING STARS =====', 
    '// ===== RATING STARS =====', 
    content, 
    flags=re.DOTALL
)

# 3. Remove DOWNLOAD MENU block
# Starts with // ===== DOWNLOAD MENU =====
# Ends before // ===== DOWNLOAD PROGRAMMA =====
content = re.sub(
    r'// ===== DOWNLOAD MENU =====.*?// ===== DOWNLOAD PROGRAMMA =====', 
    '// ===== DOWNLOAD PROGRAMMA =====', 
    content, 
    flags=re.DOTALL
)

# 4. Remove DOWNLOAD PROGRAMMA block
# Starts with // ===== DOWNLOAD PROGRAMMA =====
# Ends before // ===== BACK TO TOP BUTTON =====
content = re.sub(
    r'// ===== DOWNLOAD PROGRAMMA =====.*?// ===== BACK TO TOP BUTTON =====', 
    '// ===== BACK TO TOP BUTTON =====', 
    content, 
    flags=re.DOTALL
)

# 5. Append new logic
new_logic = """
// ===== DYNAMIC CONTENT LOADING =====
document.addEventListener("DOMContentLoaded", function() {
    loadMenu();
    loadEvents();
});

async function loadMenu() {
    try {
        console.log("Loading menu...");
        const response = await fetchWithRetry(`${CONFIG.API_BASE_URL}/api/public/menu`);
        const result = await response.json();
        
        if (result.success && result.data) {
            renderMenu(result.data);
        } else {
            console.error("Failed to load menu data", result);
        }
    } catch (e) {
        console.error("Error loading menu:", e);
    }
}

function renderMenu(menuData) {
    const tabsContainer = document.getElementById("menu-tabs");
    const tabsMobileContainer = document.getElementById("menu-tabs-mobile");
    const menuContainer = document.getElementById("menu-container");
    
    if (!tabsContainer || !menuContainer) return;
    
    tabsContainer.innerHTML = "";
    if (tabsMobileContainer) tabsMobileContainer.innerHTML = "";
    menuContainer.innerHTML = "";
    
    const categories = Object.keys(menuData);
    if (categories.length === 0) {
        menuContainer.innerHTML = "<p class='text-center w-full'>Nessun menu disponibile.</p>";
        return;
    }
    
    // Sort categories precedence if needed, but for now use DB order if possible or just object keys order
    // Object keys order is not guaranteed, but usually insertion order in modern JS.
    // Ideally we would have a priority list.
    
    let activeCategory = categories[0];
    
    const renderActiveCategory = (cat) => {
        // Update tabs styling
        document.querySelectorAll(".menu-category-btn").forEach(btn => {
            if (btn.dataset.category === cat) {
                btn.className = "menu-category-btn active px-6 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-md";
            } else {
                btn.className = "menu-category-btn px-6 py-2 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors duration-200";
            }
        });
        renderMenuItems(menuData[cat]);
    };

    categories.forEach((cat, index) => {
        // Desktop Tab
        const btn = document.createElement("button");
        btn.dataset.category = cat;
        btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        btn.className = index === 0 
            ? "menu-category-btn active px-6 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg transition-colors duration-200 shadow-md"
            : "menu-category-btn px-6 py-2 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors duration-200";
            
        btn.onclick = () => renderActiveCategory(cat);
        tabsContainer.appendChild(btn);
        
        // Mobile Tab
        if (tabsMobileContainer) {
            const mobileBtn = btn.cloneNode(true);
            mobileBtn.onclick = () => renderActiveCategory(cat);
            // Ensure classes match
             mobileBtn.className = index === 0 
                ? "menu-category-btn active px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-full whitespace-nowrap shadow-sm transition flex-shrink-0"
                : "menu-category-btn px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-full whitespace-nowrap shadow-sm transition flex-shrink-0";
            
            // Override click to update classes specifically for mobile if needed, but reusing logic is fine
             mobileBtn.onclick = () => {
                 document.querySelectorAll("#menu-tabs-mobile .menu-category-btn").forEach(b => {
                     b.className = "menu-category-btn px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-full whitespace-nowrap shadow-sm transition flex-shrink-0";
                 });
                 mobileBtn.className = "menu-category-btn active px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-full whitespace-nowrap shadow-sm transition flex-shrink-0";
                 
                 // Also update desktop active state silently
                 renderMenuItems(menuData[cat]);
             }
            tabsMobileContainer.appendChild(mobileBtn);
        }
    });

    renderMenuItems(menuData[activeCategory]);
}

function renderMenuItems(items) {
    const container = document.getElementById("menu-container");
    container.innerHTML = "";
    
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 border border-gray-100";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-bold text-blue-900">${item.nome}</h3>
                <span class="font-bold text-yellow-600 text-lg">€${parseFloat(item.prezzo).toFixed(2)}</span>
            </div>
            <p class="text-gray-600 text-sm mb-3 italic">${item.descrizione || ''}</p>
        `;
        container.appendChild(div);
    });
}

async function loadEvents() {
    try {
        console.log("Loading events...");
        const response = await fetchWithRetry(`${CONFIG.API_BASE_URL}/api/public/events`);
        const result = await response.json();
        
        if (result.success && result.data) {
            renderEvents(result.data);
        }
    } catch (e) {
        console.error("Error loading events:", e);
    }
}

function renderEvents(events) {
    const tabsContainer = document.getElementById("events-tabs");
    const eventsContainer = document.getElementById("events-container");
    
    if (!tabsContainer || !eventsContainer) return;
    
    tabsContainer.innerHTML = "";
    eventsContainer.innerHTML = ""; // Clear
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
        // event.data is YYYY-MM-DD
        if (!eventsByDate[event.data]) {
            eventsByDate[event.data] = [];
        }
        eventsByDate[event.data].push(event);
    });
    
    const dates = Object.keys(eventsByDate).sort();
    
    if (dates.length === 0) {
        eventsContainer.innerHTML = "<p class='text-center w-full'>Nessun evento in programma.</p>";
        return;
    }
    
    let activeDate = dates[0];
    
    const renderActiveDate = (date) => {
        // Update tabs
        document.querySelectorAll(".event-day-btn").forEach(btn => {
            if (btn.dataset.date === date) {
                btn.className = "event-day-btn active px-6 py-2 text-sm font-bold bg-blue-700 text-white rounded-md shadow-md transition";
            } else {
                btn.className = "event-day-btn px-6 py-2 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition";
            }
        });
        renderEventItems(eventsByDate[date]);
    };

    dates.forEach((date, index) => {
        // Format date: YYYY-MM-DD -> DD/MM
        const dateObj = new Date(date);
        const dayStr = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' });
        const weekdayStr = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
        const label = `${weekdayStr} ${dayStr}`; // e.g., Ven 29/5
        
        const btn = document.createElement("button");
        btn.dataset.date = date;
        btn.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        btn.className = index === 0
            ? "event-day-btn active px-6 py-2 text-sm font-bold bg-blue-700 text-white rounded-md shadow-md transition"
            : "event-day-btn px-6 py-2 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition";
            
        btn.onclick = () => renderActiveDate(date);
        tabsContainer.appendChild(btn);
    });
    
    renderEventItems(eventsByDate[activeDate]);
}

function renderEventItems(items) {
    const container = document.getElementById("events-container");
    container.innerHTML = "";
    
    // Grid class is on the container in HTML: class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    // Wait, the container in my updated HTML has ID events-container.
    // I should check if it has the grid classes.
    // In update_index.py I wrote: <div id="events-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    // So yes.
    
    items.forEach(event => {
        const div = document.createElement("div");
        div.className = "calendar-day bg-blue-50 p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 border border-blue-100";
        
        // Icon based on title or random?
        let icon = "fa-calendar-alt";
        const lowerTitle = event.titolo.toLowerCase();
        if (lowerTitle.includes("calcio") || lowerTitle.includes("torneo")) icon = "fa-futbol";
        else if (lowerTitle.includes("music") || lowerTitle.includes("dj") || lowerTitle.includes("concerto")) icon = "fa-music";
        else if (lowerTitle.includes("volley")) icon = "fa-volleyball-ball";
        else if (lowerTitle.includes("cucina")) icon = "fa-utensils";
        else if (lowerTitle.includes("corsa")) icon = "fa-running";
        
        // Time format HH:MM
        const timeStr = event.ora ? event.ora.substring(0, 5) : "";
        
        div.innerHTML = `
            <div class="flex items-center mb-4">
                <div class="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <i class="fas ${icon} text-xl text-blue-700"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-blue-900 leading-tight">${event.titolo}</h3>
                    <p class="text-blue-600 font-semibold text-sm mt-1">
                        <i class="far fa-clock mr-1"></i> ${timeStr}
                    </p>
                </div>
            </div>
            <p class="text-gray-700 text-sm leading-relaxed">${event.descrizione || ''}</p>
        `;
        container.appendChild(div);
    });
}
"""

content = content + new_logic

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated script.js successfully.")
