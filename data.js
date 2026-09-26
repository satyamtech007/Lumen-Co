/**
 * LUMEN & CO. — Product Catalog Data Store
 * Easily editable JSON/JavaScript data source for the e-commerce storefront.
 */

const PRODUCTS_DATA = [
  {
    id: "prod-1",
    name: "Lumen Studio Wireless Headphones",
    tagline: "Active noise-cancellation with 40-hour acoustic clarity",
    category: "audio",
    categoryLabel: "Audio & Sound",
    price: 249.00,
    originalPrice: 299.00,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    description: "Engineered with bespoke 40mm beryllium drivers, the Studio Wireless delivers breathtaking spatial audio, intuitive touch gestures, and ultra-plush memory foam earcups for all-day listening comfort.",
    specs: [
      "40-hour battery life on a single charge",
      "Hybrid Active Noise Cancellation (ANC)",
      "Multi-point Bluetooth 5.3 connectivity",
      "USB-C fast charging (10 mins = 5 hours playback)"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-1-1",
        author: "David K.",
        rating: 5,
        date: "2026-09-18",
        text: "Remarkable soundstage and the ANC is dead silent without ear fatigue. The memory foam cushions are sublime for 8-hour work sessions."
      },
      {
        id: "rev-1-2",
        author: "Claire Moreau",
        rating: 5,
        date: "2026-09-04",
        text: "Worth every penny. Minimalist build, premium metal hinges, and battery easily lasts all week."
      }
    ]
  },
  {
    id: "prod-2",
    name: "Minimalist Solid Oak Desk Mat",
    tagline: "Crafted from sustainable wool felt and vegetal leather",
    category: "workspace",
    categoryLabel: "Workspace & Desk",
    price: 68.00,
    originalPrice: null,
    badge: "Eco-Friendly",
    image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80",
    description: "Protect your workspace with architectural elegance. Designed with dual-sided premium merino wool felt and precision-stitched full grain trim to cushion your wrists and anchor your mechanical keyboard.",
    specs: [
      "Generous 90cm × 40cm ergonomic dimensions",
      "Anti-fray reinforced edge stitching",
      "Water-repellent microscopic coating",
      "Non-slip micro-textured natural rubber base"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-2-1",
        author: "Liam Thorne",
        rating: 5,
        date: "2026-09-12",
        text: "Transforms the desk into a focused workspace. The wool felt feels luxurious and keeps the keyboard acoustically muted."
      }
    ]
  },
  {
    id: "prod-3",
    name: "Chronos Titanium Automatic Timepiece",
    tagline: "Japanese automatic movement with sapphire crystal glass",
    category: "wearables",
    categoryLabel: "Watches & Wearables",
    price: 385.00,
    originalPrice: 450.00,
    badge: "Limited Edition",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    description: "An homage to timeless horological engineering. Features an aerospace-grade Grade 5 titanium chassis, 100m water resistance, and an exhibition open caseback showcasing the mechanical balance wheel.",
    specs: [
      "Grade 5 brushed titanium case (40mm diameter)",
      "Double-domed anti-reflective sapphire crystal",
      "42-hour power reserve automatic caliber",
      "Quick-release Italian vegetable-tanned leather strap"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-3-1",
        author: "Julian Sterling",
        rating: 5,
        date: "2026-09-21",
        text: "Incredible weight balance with titanium. The sweep of the automatic seconds hand is mesmerizing."
      }
    ]
  },
  {
    id: "prod-4",
    name: "Aura Ambient Ceramic Table Lamp",
    tagline: "Warm 2700K diffusion with capacitive touch dimming",
    category: "home",
    categoryLabel: "Living & Lighting",
    price: 129.00,
    originalPrice: 149.00,
    badge: null,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    description: "Hand-thrown textured stoneware base paired with a frosted glass globe creates a soft, tranquil halo in your study or bedside. Features stepless touch dimming from candle-glow to focused reading brightness.",
    specs: [
      "Stepless capacitive touch dimmer base",
      "High-CRI (>95) eye-care warm LED included",
      "Hand-finished matte terracotta ceramic glaze",
      "Braided fabric cord with brass inline details"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-4-1",
        author: "Maya Lin",
        rating: 5,
        date: "2026-08-29",
        text: "The warm 2700K glow is pure tranquility in the evenings. The touch dimmer is seamless."
      }
    ]
  },
  {
    id: "prod-5",
    name: "Nomad Canvas & Leather Travel Duffle",
    tagline: "Weatherproof 18oz duck canvas for weekend escapes",
    category: "lifestyle",
    categoryLabel: "Travel & Lifestyle",
    price: 195.00,
    originalPrice: 220.00,
    badge: "Popular",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
    description: "Built to survive a lifetime of departures. Includes a padded 16-inch laptop compartment, ventilated shoe sleeve, YKK Aquaguard zippers, and reinforced leather grab handles.",
    specs: [
      "42-liter carry-on compliant capacity",
      "Waterproof waxed cotton canvas shell",
      "Dedicated ventilated footwear compartment",
      "Detachable ergonomic padded shoulder strap"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-5-1",
        author: "Alex Rivera",
        rating: 5,
        date: "2026-09-10",
        text: "Took this across three continents already. The waxed canvas builds a gorgeous patina with wear."
      }
    ]
  },
  {
    id: "prod-6",
    name: "Solace Thermal Insulated Carafe (1.2L)",
    tagline: "24-hour heat retention with precision walnut handle",
    category: "home",
    categoryLabel: "Living & Lighting",
    price: 74.00,
    originalPrice: null,
    badge: null,
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
    description: "Keep your pour-over coffee piping hot or cold-brew iced for an entire day. Double-walled vacuum stainless steel interior enveloped in a fingerprint-resistant matte powder coat with sculpted natural walnut handle.",
    specs: [
      "Double-walled 18/8 food-grade stainless steel",
      "One-touch push-button leakproof pour lid",
      "Keeps beverages hot for 24h / cold for 36h",
      "Sculpted real American walnut wood handle"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-6-1",
        author: "Hannah Meyer",
        rating: 5,
        date: "2026-09-08",
        text: "Pours without spilling a single drop. Coffee stayed scalding hot for over 16 hours."
      }
    ]
  },
  {
    id: "prod-7",
    name: "Verve Mechanical Keyboard (Hot-Swap)",
    tagline: "Custom tactile switches with sound-dampening brass plate",
    category: "workspace",
    categoryLabel: "Workspace & Desk",
    price: 165.00,
    originalPrice: 190.00,
    badge: "New Arrival",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
    description: "Engineered for writers, designers, and programmers. Gasket-mounted for a cushioned typing feel with factory-lubed linear switches and double-shot PBT keycaps that never shine.",
    specs: [
      "75% compact layout with programmable rotary knob",
      "Tri-mode: 2.4GHz Wireless, Bluetooth 5.1, USB-C",
      "Factory-lubed Gateron Pro tactile switches",
      "Hot-swappable PCB (3-pin & 5-pin compatible)"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-7-1",
        author: "Kenji Sato",
        rating: 5,
        date: "2026-09-14",
        text: "The factory lubrication and gasket mount provide an acoustics profile that rivals custom $500 boards."
      }
    ]
  },
  {
    id: "prod-8",
    name: "Prism Precision Espresso Scale",
    tagline: "0.1g accuracy with integrated auto-brew flow timer",
    category: "home",
    categoryLabel: "Living & Lighting",
    price: 89.00,
    originalPrice: null,
    badge: null,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    description: "The indispensable companion for the serious home barista. Sleek matte black water-resistant casing with an invisible LED display that illuminates on contact.",
    specs: [
      "Ultra-fast 20ms response time with 0.1g resolution",
      "Auto-detect espresso flow rate & auto-tare mode",
      "Rechargeable lithium battery via USB-C (40h use)",
      "Includes non-slip silicone heat insulating pad"
    ],
    inStock: true,
    reviews: [
      {
        id: "rev-8-1",
        author: "Marco Rossi",
        rating: 5,
        date: "2026-09-01",
        text: "Instant flow-rate detection makes dialing in single-origin espresso effortless."
      }
    ]
  }
];

// Testimonials Data
const TESTIMONIALS_DATA = [
  {
    quote: "The Studio Wireless headphones redefined my daily work focus. Flawless acoustic balance, elegant materials, and the unboxing was pure luxury.",
    author: "Elena Rostova",
    role: "Architect & Creative Director",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
  },
  {
    quote: "Lumen's commitment to high-grade materials without inflated markups is rare. The titanium watch looks and feels like a $2,000 Swiss piece.",
    author: "Marcus Vance",
    role: "Industrial Designer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
  },
  {
    quote: "Fast shipping, impeccable packaging, and the customer support is genuinely top tier. Already placed my third order for holiday gifts.",
    author: "Sophia Chen",
    role: "Tech Consultant",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80"
  }
];
