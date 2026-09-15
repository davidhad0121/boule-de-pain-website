/* The menu shown on order.html (prices in US dollars).
   addonGroups: extras and choices shown in the item pop-up. forSize ties a group to one size
   (8in, 10in, quarter, half, full); required groups must be answered before adding.
   Items: price = starting price; sizes = size choices with their own prices; addons = group ids;
   img = file name in the bakery's Wix media library; notice = days of advance notice needed. */
window.MENU = {
  "addonGroups": {
    "g1": {
      "name": "Extra Options 8\"",
      "min": 0,
      "max": 3,
      "required": false,
      "forSize": "8in",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 12.4
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 26
        },
        {
          "name": "Edible image",
          "price": 20.6
        }
      ]
    },
    "g2": {
      "name": "Extra options 10\"",
      "min": 0,
      "max": 3,
      "required": false,
      "forSize": "10in",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 19.5
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 36
        },
        {
          "name": "Edible image",
          "price": 2.6
        }
      ]
    },
    "g3": {
      "name": "Extra options 1/4 sheet",
      "min": 0,
      "max": 3,
      "required": false,
      "forSize": "quarter",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 28.8
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 46
        },
        {
          "name": "Edible image",
          "price": 26
        }
      ]
    },
    "g4": {
      "name": "Extra option 1/2 sheet",
      "min": 0,
      "max": 3,
      "required": false,
      "forSize": "half",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 40
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 56.5
        },
        {
          "name": "Edible image",
          "price": 30.9
        }
      ]
    },
    "g5": {
      "name": "Extra option full sheet",
      "min": 0,
      "max": 2,
      "required": false,
      "forSize": "full",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 50.5
        },
        {
          "name": "Edible image",
          "price": 36
        }
      ]
    },
    "g6": {
      "name": "Extra option full sheet",
      "min": 0,
      "max": 4,
      "required": false,
      "forSize": "full",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 49
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 65
        },
        {
          "name": "Edible image",
          "price": 35
        },
        {
          "name": "Cover cake with plain fondant",
          "price": 115
        }
      ]
    },
    "g7": {
      "name": "Extra option full sheet",
      "min": 0,
      "max": 4,
      "required": false,
      "forSize": "full",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 50.5
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 67
        },
        {
          "name": "Edible image",
          "price": 36
        },
        {
          "name": "Cover cake with plain fondant",
          "price": 118.5
        }
      ]
    },
    "g8": {
      "name": "Extra options 1/4\"",
      "min": 0,
      "max": 4,
      "required": false,
      "forSize": "quarter",
      "options": [
        {
          "name": "Extra fruit decoration",
          "price": 28.8
        },
        {
          "name": "Cover the cake completely with fruit on",
          "price": 46
        },
        {
          "name": "Edible image",
          "price": 26
        },
        {
          "name": "Cover cake with plain fondant",
          "price": 46
        }
      ]
    },
    "g9": {
      "name": "Sides",
      "min": 1,
      "max": 1,
      "required": true,
      "forSize": null,
      "options": [
        {
          "name": "Cucumber Salad",
          "price": 0
        },
        {
          "name": "Potato Salad",
          "price": 0
        }
      ]
    }
  },
  "categories": [
    {
      "id": "gluten-free",
      "name": "Gluten Free Cakes 3 days in advance",
      "short": "Gluten Free",
      "note": "Order 3 days in advance.",
      "notice": 3,
      "items": [
        {
          "slug": "gluten-free-tiramisu-8",
          "name": "Gluten Free Tiramisu 8\"",
          "desc": "Gluten free cake. Manufactured in a facility that also processes: milk, egg, wheat, soy, almond, walnuts, pecan and non gluten ingredients.",
          "price": 61.2,
          "img": "37ffc0_cbd2430a71b549b8b47e30950717cc7a~mv2.jpeg"
        },
        {
          "slug": "gluten-free-light-and-dark-8",
          "name": "Gluten Free Light and Dark 8\"",
          "desc": "Gluten free cake. Manufactured in a facility that also processes: milk, egg, wheat, soy, almond, walnuts, pecan and non gluten ingredients.",
          "price": 61.2,
          "img": "37ffc0_2252926acb8b4432922480776a113ecb~mv2.png"
        },
        {
          "slug": "gluten-free-mango-cake-8",
          "name": "Gluten Free Mango Cake 8\"",
          "desc": "Gluten free cake. Manufactured in a facility that also processes: milk, egg, wheat, soy, almond, walnuts, pecan and non gluten ingredients.",
          "price": 61.2,
          "img": "37ffc0_4b5e238de4c14b38ac0a0189b6b5f012~mv2.jpeg"
        },
        {
          "slug": "gluten-free-raspberry-chocolate-8",
          "name": "Gluten Free Raspberry Chocolate 8\"",
          "desc": "Gluten free cake. Manufactured in a facility that also processes: milk, egg, wheat, soy, almond, walnuts, pecan and non gluten ingredients.",
          "price": 61.2,
          "img": "37ffc0_f44d8c0672574dd9b2577fb6569290a2~mv2.jpeg"
        }
      ]
    },
    {
      "id": "coffee-cakes",
      "name": "Coffee Cake",
      "short": "Coffee Cake",
      "items": [
        {
          "slug": "pear-almond",
          "name": "Pear Almond",
          "desc": "Sliced pear with almond paste.",
          "price": 19.95,
          "img": "37ffc0_b378d30e0b8443988e8428a56b97f73e~mv2.png"
        },
        {
          "slug": "raspberry-walnut",
          "name": "Raspberry Walnut",
          "desc": "Coffee cake filled with raspberry jam and walnuts.",
          "price": 19.95,
          "img": "37ffc0_20294e6ed0b2447183869790ae209a21~mv2.png"
        },
        {
          "slug": "chocolate-chip-brioche",
          "name": "Chocolate Chip Brioche",
          "desc": "Light and fluffy coffee cake with layers of chocolate chip.",
          "price": 19.95,
          "img": "37ffc0_3bfa1b90f78f4a398a48cfe4016f4215~mv2.png"
        },
        {
          "slug": "cinnamon-walnut",
          "name": "Cinnamon Walnut",
          "desc": "Vanilla bundt cake with cinnamon and walnuts.",
          "price": 22.95,
          "img": "37ffc0_6c02af6c91694d7abf996300c4689e4f~mv2.jpg"
        },
        {
          "slug": "cheese-loaf",
          "name": "Cheese Loaf",
          "desc": "Sweet cheese with small raisins, topped with powdered sugar.",
          "price": 22.95,
          "img": "37ffc0_528f2154fbf04bdf9b6cdef85d44937e~mv2.jpg"
        },
        {
          "slug": "nescafe",
          "name": "Nescafe",
          "price": 22.95,
          "img": "37ffc0_1f7841590c4c45c0996356e4da577b0c~mv2.jpg"
        }
      ]
    },
    {
      "id": "viennoiseries",
      "name": "French Viennoiseries",
      "short": "Viennoiseries",
      "items": [
        {
          "slug": "croissant",
          "name": "Croissant",
          "price": 5,
          "img": "37ffc0_ca6dd424b81e4c09b5053edad176651d~mv2.jpg"
        },
        {
          "slug": "chocolate-croissant",
          "name": "Chocolate Croissant",
          "price": 5,
          "img": "37ffc0_750adbc4fc764acea50ec5d25688e3a9~mv2_d_3300_3300_s_4_2.jpg"
        },
        {
          "slug": "almond-croissant",
          "name": "Almond Croissant",
          "price": 6,
          "img": "37ffc0_ced738a4bc3b4647848b1f9dedceb076~mv2.png"
        },
        {
          "slug": "chocolate-almond-croissant",
          "name": "Chocolate Almond Croissant",
          "price": 6,
          "img": "37ffc0_0a8b7a3affed4eb6b2d2462c43d1f301~mv2.png"
        },
        {
          "slug": "apple-turnover",
          "name": "Apple Turnover",
          "price": 5,
          "img": "37ffc0_a15472d9fa694a49b2a44938f364beb5~mv2.png"
        },
        {
          "slug": "cheese-danish",
          "name": "Cheese Danish",
          "price": 5,
          "img": "37ffc0_6d6fd56dbe2947e5852af1d9cd5e41ce~mv2.png"
        },
        {
          "slug": "palmier",
          "name": "Palmier",
          "price": 5,
          "img": "37ffc0_0185f787a6424861bbcecd62054042c9~mv2.jpeg"
        },
        {
          "slug": "kouign-amann",
          "name": "Kouign Amann",
          "price": 5,
          "img": "37ffc0_0cfc364d2daf4ab5a883603e4cbe8077~mv2.png",
          "popular": true
        },
        {
          "slug": "cannele",
          "name": "Cannelé",
          "price": 5,
          "img": "37ffc0_8dc6d7e8916e465083105934c7568650~mv2.png"
        },
        {
          "slug": "raisin-roll",
          "name": "Raisin Roll",
          "price": 5,
          "img": "37ffc0_be45854d3ccf4b21932384c9ae0bba42~mv2.png"
        },
        {
          "slug": "cinnamon-bun",
          "name": "Cinnamon Bun",
          "price": 5,
          "img": "37ffc0_d393fb0926c6406ea52a45741107c5f3~mv2.png",
          "popular": true
        },
        {
          "slug": "blueberry-scone",
          "name": "Blueberry Scone",
          "price": 5,
          "img": "37ffc0_4e7639a5150e46cdbb931c0100f92968~mv2.jpeg"
        },
        {
          "slug": "nutella-donut",
          "name": "Nutella Donut",
          "price": 5,
          "img": "37ffc0_1bd8e49730014273bb4f3b23886b80a2~mv2.png",
          "popular": true
        },
        {
          "slug": "raspberry-donut",
          "name": "Raspberry Donut",
          "price": 5,
          "img": "37ffc0_fcb190d1b0874cbf9a43a27c139f5005~mv2.png"
        },
        {
          "slug": "pistachio-cream-filled-croissant",
          "name": "Pistachio Cream Filled Croissant",
          "price": 9
        },
        {
          "slug": "nutella-filled-croissant",
          "name": "Nutella Filled Croissant",
          "price": 9
        },
        {
          "slug": "raspberry-cream-filled-croissant",
          "name": "Raspberry Cream Filled Croissant",
          "price": 9
        }
      ]
    },
    {
      "id": "lunch",
      "name": "Lunch",
      "short": "Lunch",
      "groups": [
        {
          "title": "Salads",
          "items": [
            {
              "slug": "baby-mixed-greens-with-chicken",
              "name": "Baby Mixed Greens with Chicken",
              "desc": "Fresh spring mix, tomato, red onions, sliced cucumber, chicken, balsamic vinaigrette.",
              "price": 15.95
            },
            {
              "slug": "chinese-chicken-salad",
              "name": "Chinese Chicken Salad",
              "desc": "Lettuce, carrots, cilantro, mandarin orange, chicken, toasted sesame dressing.",
              "price": 16.5
            },
            {
              "slug": "garden-salad",
              "name": "Garden Salad",
              "desc": "Lettuce, cucumber, tomato, red onion, feta cheese. Tossed in balsamic vinaigrette.",
              "price": 15.95
            },
            {
              "slug": "tuna-salad",
              "name": "Tuna Salad",
              "desc": "Lettuce, tuna, avocado, tomato, red onions, balsamic dressing.",
              "price": 15.95
            }
          ]
        },
        {
          "title": "Sandwiches",
          "items": [
            {
              "slug": "breakfast-sandwich",
              "name": "Breakfast Sandwich",
              "desc": "Eggs roasted peppers spread, mozzarella cheese, lettuce, tomato, avocado. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "spicy-chipotle-chicken",
              "name": "Spicy Chipotle Chicken",
              "desc": "Eggs, roasted peppers spread, mozzarella cheese, lettuce, tomato, avocado. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ],
              "labels": [
                "Mild"
              ],
              "spice": "Mild"
            },
            {
              "slug": "smoked-turkey-panini",
              "name": "Smoked Turkey Panini",
              "desc": "Smoked turkey, lettuce, tomato, avocado, sun dried tomato spread, pesto aioli. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "tuna-melt",
              "name": "Tuna Melt",
              "desc": "Tuna, sundried tomato spread, mozzarella cheese. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "chicken-pesto",
              "name": "Chicken Pesto",
              "desc": "Grilled chicken, mozzarella cheese, avocado, tomato, pesto aioli. Comes with a side of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "grilled-cheese",
              "name": "Grilled Cheese",
              "desc": "Mozzarella and American cheese. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 12.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "bagel-cream-cheese",
              "name": "Bagel Cream Cheese",
              "desc": "Cream cheese spread. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 9.5,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "lox-bagel",
              "name": "Lox Bagel",
              "desc": "Cream cheese spread, smoked salmon, tomatoes, red onions, dill. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 13.9,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "tuna-bagel",
              "name": "Tuna Bagel",
              "desc": "Tuna salad, lettuce, sun dried tomato spread, cucumbers. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 13.9,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "turkey-focaccia",
              "name": "Turkey Focaccia",
              "desc": "Arugula, smoked turkey, sundried tomatoes, avocado. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "chipotle-chicken-focaccia",
              "name": "Chipotle Chicken Focaccia",
              "desc": "Grilled chicken, avocado, baby mixed green, tomato, chipotle spread. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "tuna-focaccia",
              "name": "Tuna Focaccia",
              "desc": "Tuna, lettuce, tomato, sun dried tomato spread. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.95,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "pesto-mozzarella-focaccia",
              "name": "Pesto Mozzarella Focaccia",
              "desc": "Mozzarella, tomato, arugula, pesto aioli. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 15.95,
              "addons": [
                "g9"
              ]
            }
          ]
        },
        {
          "title": "Savory Croissant",
          "items": [
            {
              "slug": "spicy-turkey-croissant",
              "name": "Spicy Turkey Croissant",
              "desc": "Turkey, mozzarella, avocado, spicy pesto. Comes with a side of potato or cucumber salad and potato chips.",
              "price": 17.5,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "salmon-croissant",
              "name": "Salmon Croissant",
              "desc": "Smoked salmon, lettuce, tomato, avocado, red onions, cream cheese. Comes with a side of potato or cucumber salad and potato chips.",
              "price": 17.5,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "spinach-and-cheese-croissant",
              "name": "Spinach and Cheese Croissant",
              "desc": "Tomato, pesto, spinach, mozzarella. Comes with a side of potato or cucumber salad and potato chips.",
              "price": 17.5,
              "addons": [
                "g9"
              ]
            }
          ]
        },
        {
          "title": "Savory Crêpes",
          "items": [
            {
              "slug": "norwegian",
              "name": "Norwegian",
              "desc": "Smoked salmon, whipped cream cheese, capers, red onions. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 17.5,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "greek",
              "name": "Greek",
              "desc": "Roasted peppers, Kalamata Olives, Feta cheese, red onions. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 16.5,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "turkey",
              "name": "Turkey",
              "desc": "Turkey, cheese, spinach. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 17.5,
              "addons": [
                "g9"
              ]
            },
            {
              "slug": "chicken-chipotle",
              "name": "Chicken Chipotle",
              "desc": "Chicken, chipotle, cheese. Comes with a choice of potato or cucumber salad and potato chips.",
              "price": 17.5,
              "addons": [
                "g9"
              ]
            }
          ]
        },
        {
          "title": "Sweet Crêpes",
          "items": [
            {
              "slug": "sugar",
              "name": "Sugar",
              "price": 8.5
            },
            {
              "slug": "nutella",
              "name": "Nutella",
              "price": 12.5
            },
            {
              "slug": "nutella-banana",
              "name": "Nutella Banana",
              "price": 14.5
            },
            {
              "slug": "nutella-strawberry",
              "name": "Nutella Strawberry",
              "price": 14.5
            }
          ]
        },
        {
          "title": "Quiches",
          "items": [
            {
              "slug": "mushroom-quiche",
              "name": "Mushroom Quiche",
              "price": 8
            },
            {
              "slug": "broccoli-quiche",
              "name": "Broccoli Quiche",
              "price": 8
            },
            {
              "slug": "spinach-quiche",
              "name": "Spinach Quiche",
              "price": 8
            },
            {
              "slug": "bell-pepper-onions-and-potatoes-quiche",
              "name": "Bell Pepper, Onions and Potatoes Quiche",
              "price": 8
            }
          ]
        }
      ]
    },
    {
      "id": "breads",
      "name": "Breads",
      "short": "Breads",
      "items": [
        {
          "slug": "baguette",
          "name": "Baguette",
          "price": 4,
          "img": "37ffc0_3b771dbf8fcc43c0bc9055fe24c79517~mv2.jpg"
        },
        {
          "slug": "sourdough",
          "name": "Sourdough",
          "price": 6,
          "img": "37ffc0_c5dccc5bd9664a41b0e15b90c6b6c807~mv2.jpg"
        },
        {
          "slug": "whole-wheat",
          "name": "Whole Wheat",
          "price": 6,
          "img": "37ffc0_5796e81aaf674f72b88746c00bdf4f7d~mv2.jpg"
        },
        {
          "slug": "rye",
          "name": "Rye",
          "price": 6,
          "img": "37ffc0_73d83cd1a8644e02b0827787e7c2c576~mv2.jpg"
        },
        {
          "slug": "olive",
          "name": "Olive",
          "price": 6,
          "img": "37ffc0_8733b665dd3d4c8893173f28f3080833~mv2.jpg"
        },
        {
          "slug": "olive-and-zaatar",
          "name": "Olive and Zaatar",
          "price": 6,
          "img": "37ffc0_71965133bd614937a1a645bfa917abf5~mv2.jpg"
        },
        {
          "slug": "fig-and-walnuts",
          "name": "Fig and Walnuts",
          "price": 6,
          "img": "37ffc0_286b6035600848a08af0120e320ab3d0~mv2.jpg"
        },
        {
          "slug": "cranberry-and-walnuts",
          "name": "Cranberry and Walnuts",
          "price": 6,
          "img": "37ffc0_fca5eaaf42de4aa4874147de50250eb0~mv2.jpg"
        },
        {
          "slug": "multigrain",
          "name": "Multigrain",
          "price": 6,
          "img": "37ffc0_2b796dd304d64b76a21c15bc048c6c7f~mv2.jpg"
        }
      ]
    },
    {
      "id": "cakes",
      "name": "Cakes",
      "short": "Cakes",
      "note": "Pick a size and any extras when you add a cake. Some cakes need 2–3 days’ notice.",
      "items": [
        {
          "slug": "chocolate-pistachio-cheesecake-10",
          "name": "Chocolate Pistachio Cheesecake 10\"",
          "price": 66.9,
          "img": "37ffc0_8c3a0690c84444db8f743f304570968e~mv2.jpeg"
        },
        {
          "slug": "mango-cake",
          "name": "Mango Cake",
          "desc": "Vanilla cake filled with mango mousse and chunks of mango. Topped with mango glaze.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_4b5e238de4c14b38ac0a0189b6b5f012~mv2.jpeg",
          "addons": [
            "g1",
            "g2",
            "g3",
            "g4",
            "g5"
          ]
        },
        {
          "slug": "raspberry-and-dark-chocolate-mousse",
          "name": "Raspberry and Dark Chocolate Mousse",
          "desc": "Chocolate cake layered with raspberry filling and chocolate mousse filling. Covered with raspberry glaze.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_f44d8c0672574dd9b2577fb6569290a2~mv2.jpeg",
          "addons": [
            "g1",
            "g2",
            "g3",
            "g4",
            "g6"
          ]
        },
        {
          "slug": "tiramisu",
          "name": "Tiramisu",
          "desc": "Lady fingers soaked in espresso, filled with mascarpone cheese and finished with espresso glaze.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_cbd2430a71b549b8b47e30950717cc7a~mv2.jpeg",
          "addons": [
            "g1",
            "g2",
            "g3",
            "g4",
            "g6"
          ]
        },
        {
          "slug": "light-and-dark-chocolate-mousse",
          "name": "Light and Dark Chocolate Mousse",
          "desc": "Rich chocolate cake filled with light and dark chocolate mousse.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_2252926acb8b4432922480776a113ecb~mv2.png",
          "addons": [
            "g1",
            "g2",
            "g3",
            "g4",
            "g6"
          ]
        },
        {
          "slug": "chocolate-eclair",
          "name": "Chocolate Eclair",
          "desc": "Vanilla cake layered with custard, chocolate mousse and whipped cream filling. Covered with chocolate ganache and eclair puffs in and around the cake.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 64.5,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 97.9,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 127,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 236,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_2882d953459a4c96b316ff8c0320cc25~mv2.png",
          "addons": [
            "g1",
            "g2",
            "g3",
            "g4",
            "g7"
          ]
        },
        {
          "slug": "strawberry-shortcake",
          "name": "Strawberry Shortcake",
          "desc": "Vanilla cake layered with bavarian cream and fresh strawberries. Covered with whipped cream frosting.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_69ce015e2006414095a56bfd74150c08~mv2.jpeg",
          "addons": [
            "g1",
            "g2",
            "g8"
          ]
        },
        {
          "slug": "strawberry-shortcake-with-ganache",
          "name": "Strawberry Shortcake with Ganache",
          "desc": "Vanilla cake layered with bavarian cream and fresh strawberries. Covered with whipped cream frosting and topped with chocolate ganache drizzle.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 66.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 97.9,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 124.1,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 243.6,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_92bf65d261de4f329edd4b6145ddf793~mv2.png",
          "addons": [
            "g1",
            "g2",
            "g8"
          ]
        },
        {
          "slug": "tres-leches",
          "name": "Tres Leches",
          "desc": "Vanilla cake soaked in three different types of milk with caramel mousse filling, and whipped cream frosting.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 124.1,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 243.6,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_04bfcd53fdba4fe5a151a4eed8c37e23~mv2.png",
          "addons": [
            "g1",
            "g2",
            "g8"
          ]
        },
        {
          "slug": "strawberry-tres-leches-order-2-days-in-advance",
          "name": "Strawberry Tres Leches - order 2 days in advance",
          "desc": "Vanilla cake soaked in three different types of milk with caramel mousse filling, and whipped cream frosting. Filled with strawberries.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 61.4,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 72.6,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 97.9,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 140,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 254.9,
              "key": "full"
            }
          ],
          "price": 61.4,
          "img": "37ffc0_b8bef656461f49d385c38e4381db7009~mv2.jpg",
          "addons": [
            "g1",
            "g2",
            "g8"
          ],
          "notice": 2
        },
        {
          "slug": "mixed-berry-cake",
          "name": "Mixed berry cake",
          "desc": "Vanilla cake, Bavarian cream and mixed berries. Frosted with whipped cream.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 61.4,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 72.6,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 109.7,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 159.1,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 320.3,
              "key": "full"
            }
          ],
          "price": 61.4,
          "img": "37ffc0_69ce015e2006414095a56bfd74150c08~mv2.jpeg",
          "addons": [
            "g1",
            "g2",
            "g8"
          ]
        },
        {
          "slug": "carrot-cake-order-2-days-in-advance",
          "name": "Carrot Cake - order 2 days in advance",
          "desc": "Carrot cake with buttercream filling and buttercream frosting.",
          "sizes": [
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 61.4,
          "img": "37ffc0_5c2de7eb9d7f4593b3a880da61419d84~mv2.png",
          "addons": [
            "g1",
            "g2",
            "g8"
          ],
          "notice": 2
        },
        {
          "slug": "red-velvet-order-3-days-in-advance",
          "name": "Red Velvet - order 3 days in advance",
          "sizes": [
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 61.4,
          "img": "37ffc0_5c0fba8f182447a2be6774f35f80704a~mv2.jpg",
          "addons": [
            "g1",
            "g2",
            "g8"
          ],
          "notice": 3
        },
        {
          "slug": "mixed-berry-napoleon-order-2-days-in-advance",
          "name": "Mixed Berry Napoleon - order 2 days in advance",
          "desc": "Puff pastry layered with bavarian cream and topped with caramel. Filled with berries.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 61.4,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 72.6,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 109.7,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 159.1,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 320.3,
              "key": "full"
            }
          ],
          "price": 61.4,
          "img": "37ffc0_9fedf44f873a41539a5296883664d0d8~mv2.jpg",
          "notice": 2
        },
        {
          "slug": "princess-cake-3-days-in-advance",
          "name": "Princess Cake - 3 days in advance",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 66.4,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 91.1,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 127,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 171.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 333.2,
              "key": "full"
            }
          ],
          "price": 66.4,
          "img": "37ffc0_039f585edc1c4d5197d44bb0fd7a755a~mv2.jpeg",
          "addons": [
            "g1",
            "g2",
            "g8"
          ],
          "notice": 3
        },
        {
          "slug": "caramel-napoleon",
          "name": "Caramel Napoleon",
          "desc": "Puff pastry layered with bavarian cream and topped with caramel.",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 72.6,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 86,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 117.5,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "img": "37ffc0_86e5b12ffd2c4082932823cef308c516~mv2.jpg",
          "addons": [
            "g1",
            "g2",
            "g8"
          ]
        },
        {
          "slug": "black-forest-2-days-in-advance",
          "name": "Black Forest 2 days in advance",
          "desc": "Chocolate cake with cherry mousse inside",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 48.9,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 61.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 97.9,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 124.1,
              "key": "half"
            },
            {
              "name": "full sheet (80-100 ppl)",
              "price": 231,
              "key": "full"
            }
          ],
          "price": 48.9,
          "addons": [
            "g1",
            "g2",
            "g8"
          ],
          "notice": 2
        },
        {
          "slug": "cheesecake-10-order-2-days-in-advance",
          "name": "Cheesecake 10\" - order 2 days in advance",
          "desc": "New York style cheesecake.",
          "price": 64.5,
          "addons": [
            "g2"
          ],
          "notice": 2
        },
        {
          "slug": "lemon-cake",
          "name": "Lemon cake",
          "sizes": [
            {
              "name": "8\" (8-10 ppl)",
              "price": 55.1,
              "key": "8in"
            },
            {
              "name": "10\" (10-15 ppl)",
              "price": 66.4,
              "key": "10in"
            },
            {
              "name": "1/4 sheet (20-25 ppl)",
              "price": 97.9,
              "key": "quarter"
            },
            {
              "name": "1/2 sheet (40-50 ppl)",
              "price": 124.1,
              "key": "half"
            },
            {
              "name": "Full sheet (90-100 ppl)",
              "price": 243.69,
              "key": "full"
            }
          ],
          "price": 55.1
        }
      ]
    },
    {
      "id": "pastries",
      "name": "Pastries",
      "short": "Pastries",
      "items": [
        {
          "slug": "mini-eclairs-2p",
          "name": "Mini Eclairs - 2p",
          "desc": "A layer of whipped cream with custard and bread covered with chocolate ganache.",
          "price": 6.5,
          "img": "37ffc0_90cbb0303c514711b876a69d66265e8a~mv2.jpeg"
        },
        {
          "slug": "mini-cheesecake-2p",
          "name": "Mini Cheesecake - 2p",
          "price": 6.5,
          "img": "37ffc0_7914566a9b5649cfa8a3f4775b07da1b~mv2.jpeg"
        },
        {
          "slug": "mini-raspberry-and-dark-chocolate-mousse-2p",
          "name": "Mini Raspberry and Dark Chocolate Mousse - 2p",
          "desc": "Chocolate cake with a touch of raspberry flavor filled with dark chocolate mousse, topped with raspberry glaze.",
          "price": 6.5,
          "img": "37ffc0_fb2b392df39f434f85a08f6382ae6f64~mv2.jpeg"
        },
        {
          "slug": "mini-mango-mousse-2p",
          "name": "Mini Mango Mousse - 2p",
          "desc": "A bottom layer with sponge cake filled with mango mousse and topped with clear glaze.",
          "price": 6.5,
          "img": "37ffc0_f3042bc54eae4db8b3631dec7011b07d~mv2.jpeg"
        },
        {
          "slug": "mini-strawberry-mousse-2p",
          "name": "Mini Strawberry Mousse - 2p",
          "desc": "A layer of white cake with strawberry mousse filling.",
          "price": 6.5,
          "img": "37ffc0_76c470456bef4e49905d8f75818c9435~mv2.png"
        },
        {
          "slug": "mini-white-chocolate-mousse-2p",
          "name": "Mini White Chocolate Mousse - 2p",
          "desc": "White sponge cake filled with white chocolate mousse and a touch of chocolate ganache then topped with whipped cream.",
          "price": 6.5,
          "img": "37ffc0_c3ddcee93a124d73bff84387f6482c17~mv2.jpeg"
        },
        {
          "slug": "mini-passion-fruit-2p",
          "name": "Mini Passion Fruit - 2p",
          "desc": "A combination of passion fruit mousse and raspberry mousse layered in white sponge cake.",
          "price": 6.5,
          "img": "37ffc0_7f8395b03dee475aa3d740ee6bc2360e~mv2.png"
        },
        {
          "slug": "mini-lemon-meringue-2p",
          "name": "Mini Lemon Meringue - 2p",
          "desc": "Vanilla cake with lemon curd, lemon mousse filling and torched whipped cream.",
          "price": 6.5,
          "img": "37ffc0_cad4ff8a97d54816b8b2e41f7d0e68b8~mv2.jpeg"
        },
        {
          "slug": "mini-cappuccino-mousse-2p",
          "name": "Mini Cappuccino Mousse - 2p",
          "desc": "A layer of chocolate cake with french mocha cream.",
          "price": 6.5,
          "img": "37ffc0_d9c05cfddf78460d8d321d907cdeb928~mv2.jpeg"
        },
        {
          "slug": "mini-truffle-2p",
          "name": "Mini Truffle - 2p",
          "desc": "A layer of chocolate cake with rich chocolate truffle trim.",
          "price": 6.5,
          "img": "37ffc0_f3b6803392694134859c03c211fa273c~mv2.png"
        },
        {
          "slug": "mini-napoleon-2p",
          "name": "Mini Napoleon - 2p",
          "desc": "Puff pastry layered with bavarian cream and topped with caramel.",
          "price": 6.5,
          "img": "37ffc0_277fc34bf5b342caa9e2e65d3c407c7e~mv2.png"
        },
        {
          "slug": "rumballs-2-pieces",
          "name": "Rumballs - 2 pieces",
          "desc": "Chocolate rum balls.",
          "price": 6.5,
          "img": "37ffc0_5737e76c6c524075bedd175f276335f8~mv2.jpeg"
        },
        {
          "slug": "black-forest-2-pieces",
          "name": "Black Forest - 2 pieces",
          "price": 6.5,
          "img": "37ffc0_a280970847b347b5bd1d84f0a4ad83de~mv2.jpeg"
        },
        {
          "slug": "italian-cannoli-2-pieces",
          "name": "Italian Cannoli -2 pieces",
          "desc": "Filled with ricotta cheese.",
          "price": 6.5,
          "img": "37ffc0_17279003ae3f45ab9e2481959ff8bdec~mv2.jpeg"
        },
        {
          "slug": "mini-tiramisu-2p",
          "name": "Mini Tiramisu - 2p",
          "desc": "Ladyfingers soaked in espresso, filled with mascarpone cheese and finished with espresso glaze.",
          "price": 6.5,
          "img": "37ffc0_9a209870f6744175ad0a71c4d2fa8521~mv2.jpeg"
        },
        {
          "slug": "cream-puff-2p",
          "name": "Cream Puff - 2p",
          "desc": "Cream puff pastry filled with custard and whipped cream.",
          "price": 6.5,
          "img": "37ffc0_5e7eead370e54b16afe7f98b97898077~mv2.png"
        },
        {
          "slug": "mini-fruit-tart-2p",
          "name": "Mini Fruit Tart - 2p",
          "desc": "A small cookie shell torte filled with vanilla cream, fresh fruits, topped with apricot glaze",
          "price": 8.5,
          "img": "37ffc0_c896c158f53b4a38a5510d93f8292531~mv2.jpg"
        },
        {
          "slug": "creme-brulee-2-pieces",
          "name": "Creme brulée - 2 pieces",
          "price": 8.5
        },
        {
          "slug": "large-fruit-tart-2p",
          "name": "Large Fruit Tart - 2p",
          "desc": "A large cookie shell torte filled with vanilla cream, fresh fruits, topped with apricot glaze.",
          "price": 13.5,
          "img": "37ffc0_445f43daffa048819e1eb168051334da~mv2.jpeg"
        },
        {
          "slug": "large-napoleon-2p",
          "name": "Large Napoleon - 2p",
          "desc": "Puff pastry layered with bavarian cream and topped with caramel.",
          "price": 13.5,
          "img": "37ffc0_9192b4dd6c0442d6921b3ea047711d33~mv2.jpeg"
        },
        {
          "slug": "large-tiramisu-2p",
          "name": "Large Tiramisu - 2p",
          "desc": "Ladyfingers soaked in espresso, filled with mascarpone cheese and finished with espresso glaze.",
          "price": 13.5,
          "img": "37ffc0_9a209870f6744175ad0a71c4d2fa8521~mv2.jpeg"
        },
        {
          "slug": "large-mixed-berry-rolada-2p",
          "name": "Large Mixed Berry Rolada - 2p",
          "desc": "Vanilla cake, Bavarian cream and mixed berries.",
          "price": 13.5,
          "img": "37ffc0_804db9b4f8f642e391d21297713cc12a~mv2.jpeg"
        },
        {
          "slug": "large-mango-mousse-2p",
          "name": "Large Mango Mousse - 2p",
          "desc": "Sponge cake filled with fresh mango pieces, mango mousse and clear glaze.",
          "price": 13.5,
          "img": "37ffc0_9e3ff4f601c84d458e0ed4e4001d0195~mv2.png"
        },
        {
          "slug": "large-truffle-2-pieces",
          "name": "Large Truffle - 2 pieces",
          "desc": "Chocolate cake with rich chocolate truffle trim.",
          "price": 13.5,
          "img": "37ffc0_85d6dd1cb90244139868c7943e6616ff~mv2.png"
        },
        {
          "slug": "large-raspberry-and-chocolate-mousse-2p",
          "name": "Large Raspberry and Chocolate Mousse - 2p",
          "desc": "Chocolate cake with a touch of raspberry flavor filled with dark chocolate mousse and topped with raspberry glaze.",
          "price": 13.5,
          "img": "37ffc0_607b483f9f934eed974a7c8e2f6821b7~mv2.jpg"
        },
        {
          "slug": "strawberry-tres-leches-2p",
          "name": "Strawberry Tres Leches (2p)",
          "desc": "Vanilla cake soaked in three different types of milk with caramel mousse filling, and whipped cream frosting. Filled with strawberries.",
          "price": 13.5,
          "img": "37ffc0_754453f9feef41a7bcd0003186650634~mv2.jpg"
        },
        {
          "slug": "strawberry-shortcake-2p",
          "name": "Strawberry Shortcake (2p)",
          "desc": "Vanilla cake layered with bavarian cream and fresh strawberries.",
          "price": 13.5,
          "img": "37ffc0_9e81d20d74cc49af8c47f9265e890293~mv2.jpg"
        }
      ]
    }
  ]
};
