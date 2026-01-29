import re

file_path = r"c:\Users\gab\Desktop\Progetti_Personali\FestaDelloSport_\app\templates\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define new Menu Section Content
new_menu_section = """    <!-- Menu Section -->
    <section id="menu" class="py-20 bg-gray-50">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold mb-12 text-center playfair text-blue-900">Menu</h2>
            
            <!-- Menu Category Tabs -->
            <div id="menu-tabs" class="mb-8 hidden sm:flex justify-center flex-wrap gap-2"></div>
            <div id="menu-tabs-mobile" class="sm:hidden overflow-x-auto pb-2 flex gap-2 px-2 justify-start items-start"></div>
            
            <!-- Menu Items Container -->
            <div id="menu-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            
            <div class="mt-10 text-center">
                <a href="#" class="inline-block bg-transparent hover:bg-blue-700 text-blue-700 hover:text-white font-bold py-2 px-6 border border-blue-700 hover:border-transparent rounded transition duration-300">
                    Scarica il menu completo
                </a>
            </div>
        </div>
    </section>
"""

# Define new Events Section Content
new_events_section = """    <!-- Events Schedule Section -->
    <section id="events" class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold mb-12 text-center playfair text-blue-900">Programma Eventi</h2>
            
            <!-- Events Tabs -->
            <div id="events-tabs" class="mb-8 flex justify-center flex-wrap gap-2"></div>
            
            <!-- Events Container -->
            <div id="events-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            
            <div class="mt-10 text-center">
                <a href="#" class="inline-block bg-transparent hover:bg-blue-700 text-blue-700 hover:text-white font-bold py-2 px-6 border border-blue-700 hover:border-transparent rounded transition duration-300">
                    Scarica il programma completo
                </a>
            </div>
        </div>
    </section>
"""

# Regex to find Menu Section (from <section id="menu" to </section> before reservation)
# We assume standard structure: <section id="menu"... </section> followed by <section id="reservation"
# We match everything lazily until the next section tag.

# Replace Menu
# Look for <section id="menu" ... </section>
# Note: dotall=True
content = re.sub(
    r'<section id="menu".*?</section>\s*(?=<!-- Reservation Section -->|<section id="reservation")', 
    new_menu_section, 
    content, 
    flags=re.DOTALL
)

# Replace Events
# Look for <section id="events" ... </section>
content = re.sub(
    r'<section id="events".*?</section>\s*(?=<!-- Feedback Section -->|<section id="feedback")', 
    new_events_section, 
    content, 
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated index.html successfully.")
