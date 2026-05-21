export const CATEGORY_RULES = [
  { cat: 'Produce', keywords: ['fresh','strawberr','blueberr','watermelon','cantaloupe','cherry','cherries','grapes','apple','orange','pineapple','squash','zucchini','broccoli','spinach','lettuce','celery','carrot','onion','potato','tomato','parsley','cucumber','beans','peas','brussels','salad blend','romaine','coleslaw','arugula','kale','mushroom'] },
  { cat: 'Dairy & Eggs', keywords: ['milk','cheese','yogurt','butter','cream','egg','mozzarella','cheddar','gouda','sour cream','cottage','fairlife','brie','feta','ricotta'] },
  { cat: 'Meat & Seafood', keywords: ['beef','chicken','turkey','pork','ham','bacon','sausage','salami','pepperoni','prosciutto','steak','roast','flank','smoked','shrimp','salmon','tuna','tilapia','ground beef'] },
  { cat: 'Frozen', keywords: ['frozen','pizza snack','corn dog','taquito','ice cream','pizza rolls','frozen pizza'] },
  { cat: 'Pantry', keywords: ['rice','pasta','flour','sugar','oil','sauce','soup','beans','diced tomato','salt','pepper','spice','seasoning','vinegar','mustard','ketchup','bbq','teriyaki','garlic','jam','jelly','peanut butter','crackers','salsa','mayo','ranch','dressing','broth','stock','canned'] },
  { cat: 'Snacks & Bars', keywords: ['protein bar','met-rx','one bar','dipped bar','trail mix','pretzel','pop-tart','toaster','cheez-it','multipack','snack mix','granola bar'] },
  { cat: 'Beverages', keywords: ['water','soda','juice','coffee','tea','energy drink','sparkling','crystal light','capri sun','monster','alani','core power','muscle milk','nutritional shake','protein shake','lemonade','drink mix'] },
  { cat: 'Bread & Bakery', keywords: ['bread','bun','tortilla','muffin','bagel','baguette','roll','bakery','croissant','loaf'] },
  { cat: 'Household', keywords: ['toilet paper','paper plate','trash bag','ziploc','bag','sponge','detergent','laundry','dish soap','spray','cleaner','goo gone','alcohol','antiseptic','wipe','paper towel','foil','wrap'] },
  { cat: 'Personal Care', keywords: ['shampoo','conditioner','body wash','toothpaste','deodorant','antiperspirant','shave','razor','lotion','moisturizer','face wash'] },
  { cat: 'Pet', keywords: ['dog food','dog treat','cat food','pet food','heritage ranch','purina','pedigree'] },
  { cat: 'Health', keywords: ['eye drop','cold flu','medicine','pain relief','pedialyte','vitamin','supplement','ibuprofen','tylenol','allergy'] },
  { cat: 'Prepared & Deli', keywords: ['meal simple','deli','charcuterie','guacamole','ready rice','personal pizza','rotisserie','pre-made'] },
  { cat: 'Chips & Crackers', keywords: ['chips','tortilla chip','potato chip','pringles','doritos','fritos','lays','kettle'] },
]

export function categorize(name) {
  const n = name.toLowerCase()
  for (const { cat, keywords } of CATEGORY_RULES) {
    if (keywords.some(k => n.includes(k))) return cat
  }
  return 'Other'
}

export const CAT_COLORS = {
  'Produce': '#2d6a4f',
  'Dairy & Eggs': '#2563eb',
  'Meat & Seafood': '#c2410c',
  'Frozen': '#7c3aed',
  'Pantry': '#b45309',
  'Snacks & Bars': '#be185d',
  'Beverages': '#0f766e',
  'Bread & Bakery': '#d97706',
  'Household': '#6b7280',
  'Personal Care': '#0891b2',
  'Pet': '#65a30d',
  'Health': '#dc2626',
  'Prepared & Deli': '#059669',
  'Chips & Crackers': '#ea580c',
  'Other': '#9ca3af',
}

export const CAT_BG = {
  'Produce': '#e8f5ee',
  'Dairy & Eggs': '#eff6ff',
  'Meat & Seafood': '#fff7ed',
  'Frozen': '#f5f3ff',
  'Pantry': '#fffbeb',
  'Snacks & Bars': '#fdf2f8',
  'Beverages': '#f0fdfa',
  'Bread & Bakery': '#fefce8',
  'Household': '#f9fafb',
  'Personal Care': '#ecfeff',
  'Pet': '#f7fee7',
  'Health': '#fef2f2',
  'Prepared & Deli': '#ecfdf5',
  'Chips & Crackers': '#fff7ed',
  'Other': '#f3f4f6',
}
