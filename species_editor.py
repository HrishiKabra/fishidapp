import sqlite3
import json

def view_all_species():
    """View all species in the database"""
    conn = sqlite3.connect('species.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM species ORDER BY common_name")
    rows = cursor.fetchall()
    
    print(f"\n📊 Total species in database: {len(rows)}")
    print("=" * 80)
    
    for i, row in enumerate(rows, 1):
        print(f"\n{i}. {row[2]} ({row[1]})")
        print(f"   Size: {row[6]} | IUCN: {row[7]} | Habitat: {row[4]}")
        print(f"   Location: {row[5]}")
        print(f"   Description: {row[8]}")
        print(f"   Image: {row[3]}")
        print("-" * 40)
    
    conn.close()

def edit_species():
    """Edit a specific species"""
    conn = sqlite3.connect('species.db')
    cursor = conn.cursor()
    
    # Show all species
    cursor.execute("SELECT id, common_name, scientific_name FROM species ORDER BY common_name")
    species_list = cursor.fetchall()
    
    print("\n📝 Edit Species")
    print("=" * 40)
    for i, (id, common_name, scientific_name) in enumerate(species_list, 1):
        print(f"{i}. {common_name} ({scientific_name})")
    
    try:
        choice = int(input("\nEnter species number to edit (0 to cancel): "))
        if choice == 0:
            return
        if 1 <= choice <= len(species_list):
            species_id = species_list[choice-1][0]
            
            # Get current species data
            cursor.execute("SELECT * FROM species WHERE id = ?", (species_id,))
            row = cursor.fetchone()
            
            print(f"\nEditing: {row[2]} ({row[1]})")
            print("=" * 40)
            
            # Edit fields
            print(f"Current common name: {row[2]}")
            new_common_name = input("New common name (press Enter to keep current): ").strip()
            if not new_common_name:
                new_common_name = row[2]
            
            print(f"Current size: {row[6]}")
            new_size = input("New size (e.g., '20 cm', '1.5 m'): ").strip()
            if not new_size:
                new_size = row[6]
            
            print(f"Current IUCN status: {row[7]}")
            new_iucn = input("New IUCN status (LC, NT, VU, EN, CR): ").strip()
            if not new_iucn:
                new_iucn = row[7]
            
            print(f"Current habitat: {row[4]}")
            new_habitat = input("New habitat: ").strip()
            if not new_habitat:
                new_habitat = row[4]
            
            print(f"Current location: {row[5]}")
            new_location = input("New location: ").strip()
            if not new_location:
                new_location = row[5]
            
            print(f"Current description: {row[8]}")
            new_description = input("New description: ").strip()
            if not new_description:
                new_description = row[8]
            
            # Update database
            cursor.execute('''
                UPDATE species 
                SET common_name = ?, size = ?, iucn_status = ?, habitat = ?, location = ?, description = ?
                WHERE id = ?
            ''', (new_common_name, new_size, new_iucn, new_habitat, new_location, new_description, species_id))
            
            conn.commit()
            print(f"✅ Updated {new_common_name} successfully!")
        else:
            print("❌ Invalid choice!")
    except ValueError:
        print("❌ Please enter a valid number!")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    conn.close()

def add_species():
    """Add a new species"""
    conn = sqlite3.connect('species.db')
    cursor = conn.cursor()
    
    print("\n🐟 Add New Species")
    print("=" * 40)
    
    scientific_name = input("Scientific name: ").strip()
    common_name = input("Common name: ").strip()
    size = input("Size (e.g., '20 cm', '1.5 m'): ").strip()
    iucn_status = input("IUCN status (LC, NT, VU, EN, CR): ").strip()
    habitat = input("Habitat: ").strip()
    location = input("Location: ").strip()
    description = input("Description: ").strip()
    image_url = input("Image URL (optional): ").strip()
    
    if not image_url:
        image_url = "/placeholder.svg?height=200&width=300&query=fish"
    
    species_id = scientific_name.replace(' ', '_').lower()
    
    try:
        cursor.execute('''
            INSERT INTO species 
            (id, scientific_name, common_name, image_url, habitat, location, size, iucn_status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (species_id, scientific_name, common_name, image_url, habitat, location, size, iucn_status, description))
        
        conn.commit()
        print(f"✅ Added {common_name} successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    conn.close()

def delete_species():
    """Delete a species"""
    conn = sqlite3.connect('species.db')
    cursor = conn.cursor()
    
    # Show all species
    cursor.execute("SELECT id, common_name, scientific_name FROM species ORDER BY common_name")
    species_list = cursor.fetchall()
    
    print("\n🗑️ Delete Species")
    print("=" * 40)
    for i, (id, common_name, scientific_name) in enumerate(species_list, 1):
        print(f"{i}. {common_name} ({scientific_name})")
    
    try:
        choice = int(input("\nEnter species number to delete (0 to cancel): "))
        if choice == 0:
            return
        if 1 <= choice <= len(species_list):
            species_id = species_list[choice-1][0]
            species_name = species_list[choice-1][1]
            
            confirm = input(f"Are you sure you want to delete {species_name}? (y/N): ").strip().lower()
            if confirm == 'y':
                cursor.execute("DELETE FROM species WHERE id = ?", (species_id,))
                conn.commit()
                print(f"✅ Deleted {species_name} successfully!")
            else:
                print("❌ Deletion cancelled.")
        else:
            print("❌ Invalid choice!")
    except ValueError:
        print("❌ Please enter a valid number!")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    conn.close()

def main():
    """Main menu"""
    while True:
        print("\n" + "=" * 50)
        print("🐟 SPECIES DATABASE EDITOR")
        print("=" * 50)
        print("1. View all species")
        print("2. Edit species")
        print("3. Add new species")
        print("4. Delete species")
        print("5. Exit")
        print("=" * 50)
        
        choice = input("Enter your choice (1-5): ").strip()
        
        if choice == '1':
            view_all_species()
        elif choice == '2':
            edit_species()
        elif choice == '3':
            add_species()
        elif choice == '4':
            delete_species()
        elif choice == '5':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice! Please enter 1-5.")

if __name__ == "__main__":
    main() 