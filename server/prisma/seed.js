import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function qrToken(length = 10) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const CATEGORIES = [
  {
    nameAr: "المقبلات",
    nameEn: "Starters",
    items: [
      {
        nameAr: "حمص بالطحينة",
        nameEn: "Hummus with Tahini",
        descAr: "حمص كريمي مع طحينة وزيت الزيتون وحبوب الحمص الكاملة",
        descEn: "Creamy chickpea hummus with tahini, olive oil and whole chickpeas",
        price: 32,
        img: img("1571877227200-a0d98ea607e9"),
      },
      {
        nameAr: "بابا غنوج",
        nameEn: "Baba Ghanoush",
        descAr: "متبل الباذنجان المشوي مع الطحينة والثوم",
        descEn: "Smoky grilled eggplant dip with tahini and garlic",
        price: 30,
        img: img("1625944230945-1b7dd3b949ab"),
      },
      {
        nameAr: "بريك بالتونة",
        nameEn: "Tuna Brik",
        descAr: "عجينة مقرمشة محشوة بالتونة والبيض والبقدونس",
        descEn: "Crispy pastry filled with tuna, egg and parsley",
        price: 28,
        img: img("1600628421066-f6bda6a7ba76"),
      },
      {
        nameAr: "سلطة مغربية",
        nameEn: "Moroccan Salad",
        descAr: "طماطم وخيار وفلفل مقطع بزيت الزيتون",
        descEn: "Diced tomato, cucumber and pepper with olive oil dressing",
        price: 26,
        img: img("1546793665-c74683f339c1"),
      },
    ],
  },
  {
    nameAr: "السلطات",
    nameEn: "Salads",
    items: [
      {
        nameAr: "سلطة سيزار بالدجاج",
        nameEn: "Chicken Caesar Salad",
        descAr: "خس روماني، دجاج مشوي، جبن بارميزان وصلصة سيزار",
        descEn: "Romaine lettuce, grilled chicken, parmesan and caesar dressing",
        price: 55,
        img: img("1550304943-4f24f54ddde9"),
      },
      {
        nameAr: "سلطة الكينوا",
        nameEn: "Quinoa Bowl",
        descAr: "كينوا، أفوكادو، طماطم كرزية وجبن الفيتا",
        descEn: "Quinoa, avocado, cherry tomatoes and feta cheese",
        price: 48,
        img: img("1512621776951-a57141f2eefd"),
      },
      {
        nameAr: "سلطة اليونانية",
        nameEn: "Greek Salad",
        descAr: "خيار، طماطم، زيتون وجبن الفيتا",
        descEn: "Cucumber, tomato, olives and feta cheese",
        price: 42,
        img: img("1540420773420-3366772f4999"),
      },
    ],
  },
  {
    nameAr: "الأطباق الرئيسية",
    nameEn: "Main Courses",
    items: [
      {
        nameAr: "طاجين اللحم بالبرقوق",
        nameEn: "Beef Tagine with Prunes",
        descAr: "لحم بقري مطهو ببطء مع البرقوق واللوز والبهارات",
        descEn: "Slow-cooked beef with prunes, almonds and warm spices",
        price: 95,
        img: img("1544025162-d76694265947"),
      },
      {
        nameAr: "كسكس بالخضار",
        nameEn: "Vegetable Couscous",
        descAr: "سميد الكسكس مع الخضار الموسمية والحمص",
        descEn: "Steamed couscous with seasonal vegetables and chickpeas",
        price: 78,
        img: img("1631292784640-2b24be784d5d"),
      },
      {
        nameAr: "دجاج مشوي بالليمون",
        nameEn: "Lemon Roasted Chicken",
        descAr: "دجاج مشوي متبل بالليمون والزعتر",
        descEn: "Roasted chicken marinated with lemon and thyme",
        price: 72,
        img: img("1598103442097-8b74394b95c6"),
      },
      {
        nameAr: "سمك مشوي",
        nameEn: "Grilled Fish",
        descAr: "سمك طازج مشوي مع صلصة الشرمولة",
        descEn: "Fresh grilled fish with chermoula sauce",
        price: 88,
        img: img("1467003909585-2f8a72700288"),
      },
      {
        nameAr: "باستا بالكريما والدجاج",
        nameEn: "Creamy Chicken Pasta",
        descAr: "باستا بصلصة الكريمة والدجاج والفطر",
        descEn: "Pasta with creamy sauce, chicken and mushrooms",
        price: 68,
        img: img("1621996346565-e3dbc646d9a9"),
      },
    ],
  },
  {
    nameAr: "المشويات",
    nameEn: "Grills",
    items: [
      {
        nameAr: "برغر لحم بقري",
        nameEn: "Beef Burger",
        descAr: "برغر لحم بقري مع الجبن والخس والبطاطس المقلية",
        descEn: "Beef patty with cheese, lettuce and served with fries",
        price: 65,
        img: img("1568901346375-23c9450c58cd"),
      },
      {
        nameAr: "كباب مشوي",
        nameEn: "Grilled Kebab",
        descAr: "أسياخ لحم مشوية مع الأرز والخضار",
        descEn: "Grilled meat skewers with rice and vegetables",
        price: 82,
        img: img("1600891964092-4316c288032e"),
      },
      {
        nameAr: "دجاج بالفحم",
        nameEn: "Charcoal Grilled Chicken",
        descAr: "دجاج مشوي على الفحم مع صلصة خاصة",
        descEn: "Charcoal-grilled chicken with house sauce",
        price: 70,
        img: img("1532550907401-a500c9a57435"),
      },
    ],
  },
  {
    nameAr: "البيتزا",
    nameEn: "Pizza",
    items: [
      {
        nameAr: "بيتزا مارغريتا",
        nameEn: "Margherita Pizza",
        descAr: "صلصة طماطم، جبن موزاريلا وريحان طازج",
        descEn: "Tomato sauce, mozzarella cheese and fresh basil",
        price: 58,
        img: img("1574071318508-1cdbab80d002"),
      },
      {
        nameAr: "بيتزا الخضار",
        nameEn: "Vegetable Pizza",
        descAr: "فلفل، فطر، زيتون وذرة",
        descEn: "Peppers, mushrooms, olives and corn",
        price: 62,
        img: img("1565299624946-b28f40a0ae38"),
      },
      {
        nameAr: "بيتزا ببيروني",
        nameEn: "Pepperoni Pizza",
        descAr: "شرائح ببروني وجبن موزاريلا",
        descEn: "Pepperoni slices with mozzarella cheese",
        price: 66,
        img: img("1628840042765-356cda07504e"),
      },
    ],
  },
  {
    nameAr: "الحلويات",
    nameEn: "Desserts",
    items: [
      {
        nameAr: "بقلاوة",
        nameEn: "Baklava",
        descAr: "عجينة مقرمشة محشوة بالمكسرات والعسل",
        descEn: "Crispy pastry layered with nuts and honey",
        price: 25,
        img: img("1519676867240-f03562e64548"),
      },
      {
        nameAr: "تشيز كيك",
        nameEn: "Cheesecake",
        descAr: "كعكة الجبن الكريمية مع صوص التوت",
        descEn: "Creamy cheesecake with berry sauce",
        price: 35,
        img: img("1567171466295-4afa63d45416"),
      },
      {
        nameAr: "كيكة الشوكولاتة الذائبة",
        nameEn: "Molten Chocolate Cake",
        descAr: "كيكة شوكولاتة ساخنة بقلب ذائب",
        descEn: "Warm chocolate cake with a molten center",
        price: 38,
        img: img("1624353365286-3f8d62daad51"),
      },
      {
        nameAr: "آيس كريم",
        nameEn: "Ice Cream",
        descAr: "ثلاث كرات آيس كريم بنكهات متنوعة",
        descEn: "Three scoops of assorted ice cream flavors",
        price: 22,
        img: img("1497034825429-c343d7c6a68f"),
      },
    ],
  },
  {
    nameAr: "المشروبات",
    nameEn: "Drinks",
    items: [
      {
        nameAr: "عصير برتقال طازج",
        nameEn: "Fresh Orange Juice",
        descAr: "عصير برتقال طبيعي 100%",
        descEn: "100% natural fresh orange juice",
        price: 20,
        img: img("1613478223719-2ab802602423"),
      },
      {
        nameAr: "شاي بالنعناع",
        nameEn: "Mint Tea",
        descAr: "شاي أخضر مغربي بالنعناع الطازج",
        descEn: "Moroccan green tea with fresh mint",
        price: 12,
        img: img("1556679343-c7306c1976bc"),
      },
      {
        nameAr: "قهوة إسبريسو",
        nameEn: "Espresso",
        descAr: "قهوة إسبريسو إيطالية أصيلة",
        descEn: "Authentic Italian espresso",
        price: 14,
        img: img("1509042239860-f550ce710b93"),
      },
      {
        nameAr: "ليموناضة",
        nameEn: "Lemonade",
        descAr: "ليموناضة منعشة بالنعناع",
        descEn: "Refreshing lemonade with mint",
        price: 18,
        img: img("1621263764928-df1444c5e859"),
      },
      {
        nameAr: "مياه معدنية",
        nameEn: "Mineral Water",
        descAr: "زجاجة مياه معدنية 50 سل",
        descEn: "500ml bottle of mineral water",
        price: 8,
        img: img("1560023907-5f339617ea30"),
      },
    ],
  },
];

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "bayt-zaytoun" },
    update: {},
    create: {
      name: "Bayt Zaytoun",
      slug: "bayt-zaytoun",
      logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80",
      currency: "MAD",
    },
  });

  const staff = [
    { name: "Yassine (Admin)", email: "admin@baytzaytoun.demo", password: "Admin123!", role: "admin" },
    { name: "Sara (Cuisine)", email: "kitchen@baytzaytoun.demo", password: "Kitchen123!", role: "kitchen" },
    { name: "Omar (Serveur)", email: "waiter@baytzaytoun.demo", password: "Waiter123!", role: "waiter" },
  ];
  for (const s of staff) {
    const hashed = await bcrypt.hash(s.password, 10);
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { restaurantId: restaurant.id, name: s.name, email: s.email, password: hashed, role: s.role },
    });
  }

  let categoryPosition = 0;
  for (const cat of CATEGORIES) {
    const category = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        position: categoryPosition++,
      },
    });
    let itemPosition = 0;
    for (const item of cat.items) {
      const menuItem = await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          descriptionAr: item.descAr,
          descriptionEn: item.descEn,
          price: item.price,
          image: item.img,
          position: itemPosition++,
        },
      });

      // Exemple d'options par plat : groupe à choix unique gratuit (sauce),
      // groupe à choix multiples payant (suppléments) — configurable par l'admin.
      if (item.nameEn === "Beef Burger") {
        await prisma.optionGroup.create({
          data: {
            menuItemId: menuItem.id,
            nameAr: "الصلصة",
            nameEn: "Sauce",
            type: "single",
            required: true,
            position: 0,
            choices: {
              create: [
                { nameAr: "كاتشب", nameEn: "Ketchup", priceDelta: 0, position: 0 },
                { nameAr: "مايونيز", nameEn: "Mayo", priceDelta: 0, position: 1 },
                { nameAr: "باربكيو", nameEn: "BBQ", priceDelta: 0, position: 2 },
              ],
            },
          },
        });
        await prisma.optionGroup.create({
          data: {
            menuItemId: menuItem.id,
            nameAr: "إضافات",
            nameEn: "Extras",
            type: "multiple",
            required: false,
            position: 1,
            choices: {
              create: [
                { nameAr: "جبن إضافي", nameEn: "Extra cheese", priceDelta: 5, position: 0 },
                { nameAr: "لحم مقدد", nameEn: "Bacon", priceDelta: 8, position: 1 },
                { nameAr: "أفوكادو", nameEn: "Avocado", priceDelta: 6, position: 2 },
              ],
            },
          },
        });
      }
    }
  }

  const tableLabels = Array.from({ length: 8 }, (_, i) => `Table ${i + 1}`);
  for (const label of tableLabels) {
    await prisma.diningTable.create({
      data: { restaurantId: restaurant.id, label, qrToken: qrToken() },
    });
  }

  const tables = await prisma.diningTable.findMany({ where: { restaurantId: restaurant.id } });

  console.log("\n=== Seed terminé ===");
  console.log(`Restaurant: ${restaurant.name} (slug: ${restaurant.slug})`);
  console.log("\nComptes staff:");
  for (const s of staff) console.log(`  - ${s.role}: ${s.email} / ${s.password}`);
  console.log("\nTables (URL client de démo):");
  for (const t of tables) console.log(`  - ${t.label}: /t/${t.qrToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
