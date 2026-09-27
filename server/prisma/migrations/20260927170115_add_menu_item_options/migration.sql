-- CreateTable
CREATE TABLE "option_groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menuItemId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "option_groups_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "option_choices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "optionGroupId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "priceDelta" REAL NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "option_choices_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "option_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_item_options" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderItemId" INTEGER NOT NULL,
    "optionChoiceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_item_options_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_item_options_optionChoiceId_fkey" FOREIGN KEY ("optionChoiceId") REFERENCES "option_choices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
