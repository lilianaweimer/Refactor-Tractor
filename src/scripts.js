import UserRepository from '../src/userRepository';
import IngredientsRepository from '../src/ingredientsRepository';
import RecipesRepository from '../src/recipesRepository';
import domUpdates from '../src/domUpdates';
import './css/base.scss';
import './css/styles.scss';
import User from './user';
import Recipe from './recipe';
import Pantry from '../src/pantry'
import './images/apple-logo-outline.png'
import './images/apple-logo.png'
import './images/cookbook.png'
import './images/seasoning.png'



let allRecipesBtn = document.querySelector(".show-all-btn");
let filterBtn = document.querySelector(".filter-btn");
let main = document.querySelector("main");
let pantryBtn = document.querySelector(".my-pantry-btn");
let savedRecipesBtn = document.querySelector(".saved-recipes-btn");
let showPantryRecipes = document.querySelector(".show-pantry-recipes-btn");
let searchInput = document.querySelector(".search-input")
let searchButton = document.querySelector(".search-button")
let recipes = [];
let ingredientsRepository;
let user;
let recipesRepository;


allRecipesBtn.addEventListener("click", () => {
  domUpdates.showAllRecipes(recipes)
});

filterBtn.addEventListener("click", () => {
  findCheckedBoxes(recipes)
});

main.addEventListener("click", () => {
  addToMyRecipes();
  getRecipe();
});
searchButton.addEventListener('click', function() {
  searchSavedRecipes(event)
  searchSavedByIngredients(event)
});

pantryBtn.addEventListener("click", domUpdates.toggleMenu);

savedRecipesBtn.addEventListener("click", () => {
  showSavedRecipes()
});

showPantryRecipes.addEventListener("click", () => {
  findCheckedPantryBoxes(ingredientsRepository);
});

Promise.all([
  fetch('https://fe-apps.herokuapp.com/api/v1/whats-cookin/1911/users/wcUsersData')
    .then(response => response.json()),
  fetch('https://fe-apps.herokuapp.com/api/v1/whats-cookin/1911/ingredients/ingredientsData')
    .then(response => response.json()),
  fetch('https://fe-apps.herokuapp.com/api/v1/whats-cookin/1911/recipes/recipeData')
    .then(response => response.json())
])
  .then(data => createDataSets(data[0].wcUsersData, data[1].ingredientsData, data[2].recipeData))
  .catch(err => console.error(err))


const createDataSets = (wcUsersData, ingredientsData, recipeData) => {
  createUserRepo(wcUsersData)
  createIngredientsRepo(ingredientsData)
  createRecipesRepo(recipeData)
  domUpdates.defineData(recipeData, ingredientsData)
  fixRecipeData()
}

const createUserRepo = (wcUsersData) => {
  let randomNum = Math.floor(Math.random() * wcUsersData.length)
  let userRepository = new UserRepository(wcUsersData)
  generateUser(userRepository.userData[randomNum])
}

const createIngredientsRepo = (ingredientsData) =>  {
  ingredientsRepository = new IngredientsRepository(ingredientsData)
  findPantryInfo('update')
  return ingredientsData
}

const createRecipesRepo = (recipeData) => {
  recipesRepository = new RecipesRepository(recipeData)
  createCards(recipesRepository.recipeData)
  findTags(recipesRepository.recipeData)
  return recipeData
}

// GENERATE A USER ON LOAD
const generateUser = (userInfo) => {
  const pantry = new Pantry(userInfo.pantry)
  user = new User(userInfo, pantry);
  const firstName = user.name.split(" ")[0];
  domUpdates.getWelcomeMessage(firstName)
  domUpdates.defineUser(user)
}

const updateUserInfo = (ingredientID, ingredientAmount) => {
  const userID = user.id;
  const amount = parseFloat(ingredientAmount)
  fetch('https://fe-apps.herokuapp.com/api/v1/whats-cookin/1911/users/wcUsersData', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userID,
      ingredientID,
      "ingredientModification": amount
    })
  }).then(response => response.json())
    .catch(err => console.error(err.message))
}

// CREATE RECIPE CARDS
const createCards = (recipeData) => {
  recipeData.forEach(recipe => {
    let recipeInfo = new Recipe(recipe);
    let shortRecipeName = recipeInfo.name;
    recipes.push(recipeInfo);
    if (recipeInfo.name.length > 40) {
      shortRecipeName = recipeInfo.name.substring(0, 40) + "...";
    }
    domUpdates.addRecipesToDom(recipeInfo, shortRecipeName)
  });
}

// FILTER BY RECIPE TAGS
const findTags = (recipeData) => {
  let tags = [];
  recipeData.forEach(recipe => {
    recipe.tags.forEach(tag => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });
  });
  tags.sort();
  domUpdates.listTags(tags);
}

const findCheckedBoxes = () => {
  let tagCheckboxes = document.querySelectorAll(".checked-tag");
  let checkboxInfo = Array.from(tagCheckboxes)
  let selectedTags = checkboxInfo.filter(box => {
    return box.checked;
  })
  findTaggedRecipes(selectedTags);
}

const findTaggedRecipes = (selected, recipeList) => {
  recipeList = user.viewingFavorites ? user.favoriteRecipes : recipes;
  let filteredResults = [];
  selected.forEach(tag => {

    let allRecipes = recipes.filter(recipe => {
      return recipe.tags.includes(tag.id);
    });
    allRecipes.forEach(recipe => {
      if (!filteredResults.includes(recipe)) {
        filteredResults.push(recipe);
      }
    })
  });
  domUpdates.showAllRecipes(filteredResults);
  if (filteredResults.length > 0) {
    filterRecipes(filteredResults);
  }
}

const filterRecipes = (filtered) => {
  let foundRecipes = recipes.filter(recipe => {
    return !filtered.includes(recipe);
  });
  domUpdates.hideUnselectedRecipes(foundRecipes)
}

const addToMyRecipes = () => {
  if (event.target.className === "card-apple-icon") {
    let cardId = parseInt(event.target.closest(".recipe-card").id)
    if (!user.favoriteRecipes.includes(cardId)) {
      user.saveRecipe(cardId);
      domUpdates.fillAppleIcon(event)
    } else {
      user.removeRecipe(cardId);
      domUpdates.emptyAppleIcon(event)
    }
  } else if (event.target.id === "exit-recipe-btn") {
    domUpdates.exitRecipe();
  } else if (isDescendant(event.target.closest(".recipe-card"), event.target)) {
    domUpdates.openRecipeInfo(event);
  }
}

const isDescendant = (parent, child) => {
  let node = child;
  while (node !== null) {
    if (node === parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

const showSavedRecipes = () => {
  let unsavedRecipes = recipes.filter(recipe => {
    return !user.favoriteRecipes.includes(recipe.id);
  });
  unsavedRecipes.forEach(recipe => {
    let domRecipe = document.getElementById(`${recipe.id}`);
    domRecipe.style.display = "none";
  });
  domUpdates.showMyRecipesBanner();
  user.viewingFavorites = true;
}

// CREATE AND USE PANTRY
const findPantryInfo = (update) => {
  const fullPantryIngredients = []
  const pantryIngredients = user.pantry.ingredients
  pantryIngredients.forEach(pantryIngredient => {
    fullPantryIngredients.push(ingredientsRepository.getIngredientName(pantryIngredient, 'ingredient'))
  })
  const sortedPantry = fullPantryIngredients.sort((a, b) => a.name.localeCompare(b.name))
  update ? domUpdates.updatePantryInfo(sortedPantry, pantryIngredients) : displayPantryInfo(sortedPantry, pantryIngredients);
}

const displayPantryInfo = (pantry, amountsPantry) => {
  pantry.forEach(ingredient => {
    let amountOfIngredient = amountsPantry.find(userIngredient => userIngredient.ingredient === ingredient.id)
    let ingredientHtml = `<li><input type="checkbox" class="pantry-checkbox" id="${ingredient.name}">
      <label for="${ingredient.name}">${ingredient.name}, ${amountOfIngredient.amount}</label></li>`;
    document.querySelector(".pantry-list").insertAdjacentHTML("beforeend",
      ingredientHtml);
  });
}

const findCheckedPantryBoxes = (ingredientsRepository) => {
  let pantryCheckboxes = document.querySelectorAll(".pantry-checkbox");
  let pantryCheckboxInfo = Array.from(pantryCheckboxes)
  let selectedIngredients = pantryCheckboxInfo.filter(box => {
    return box.checked;
  })
  domUpdates.showAllRecipes();
  if (selectedIngredients.length > 0) {
    findRecipesWithCheckedIngredients(selectedIngredients, ingredientsRepository);
  }
}

const findRecipesWithCheckedIngredients = (selected, ingredientsRepository) => {
  let recipeChecker = (arr, target) => target.every(v => arr.includes(v));
  let ingredientNames = selected.map(item => {
    return item.id;
  })
  recipes.forEach(recipe => {
    let allRecipeIngredients = [];
    recipe.ingredients.forEach(ingredient => {
      let ingredientName = ingredientsRepository.getIngredientName(ingredient, 'id');
      allRecipeIngredients.push(ingredientName.name);
    });
    if (!recipeChecker(allRecipeIngredients, ingredientNames)) {
      domUpdates.hideRecipes(recipe);
    }
  })
}

const getRecipe = () => {
  let recipeId = event.path.find(e => e.id).id;
  let recipe = recipes.find(recipe => recipe.id === Number(recipeId));
  if (event.target.classList.value === 'calculate-cost') {
    getRecipeCost(recipe)
    domUpdates.disableButton(event.target.classList.value)
  } else if (event.target.classList.value === 'check-pantry') {
    checkPantryForIngredients(recipe)
    domUpdates.disableButton(event.target.classList.value)
  } else if (event.target.classList.value === 'add-ingredients-btn') {
    putItemsInPantry(recipe)
    domUpdates.disableButton(event.target.classList.value)
  } else if (event.target.classList.value === 'cook-recipe') {
    cookRecipe(recipe)
    domUpdates.disableButton(event.target.classList.value)
  }
}

const getRecipeCost = (recipe) => {
  let userChecked = user.checkUserPantryForIngredients(recipe);
  let costOfRecipe = Math.round(ingredientsRepository.getIngredientsCost(userChecked)) / 100
  domUpdates.displayRecipeCost(costOfRecipe)
}

const checkPantryForIngredients = (recipe) => {
  let userChecked = user.checkUserPantryForIngredients(recipe);
  let ingredientsWithNames = userChecked.map(checkedIngredient => ingredientsRepository.getIngredientName(checkedIngredient, 'id'))
  if (ingredientsWithNames.length > 0 ) {
    domUpdates.displayNeededIngredients(ingredientsWithNames, userChecked, recipe)
  } else {
    domUpdates.cookMessage(recipe)
  }
}

const putItemsInPantry = (recipe) => {
  const ingredientsToAdd = updateIngredientForPost(recipe)
  let userChecked = user.checkUserPantryForIngredients(recipe);
  const pantryBefore = user.pantry.ingredients.length
  user.addItemsToPantry(userChecked)
  ingredientsToAdd.forEach(ingredientToAdd => {
    updateUserInfo(ingredientToAdd.id, ingredientToAdd.amount)
  })
  pantryBefore < user.pantry.ingredients.length ? findPantryInfo('update') : domUpdates.cookMessage(recipe)
}

const cookRecipe = (recipe) => {
  if (event.target.classList.value === 'cook-recipe') {
    const ingredientsToRemove = updateIngredientForPost(recipe)
    user.removeRecipeIngredients(recipe.ingredients)
    findPantryInfo('update')
    ingredientsToRemove.forEach(ingredientToRemove => {
      updateUserInfo(ingredientToRemove.id, `-${ingredientToRemove.amount}`)
    })
  }
}

const updateIngredientForPost = (recipe) => {
  return recipe.ingredients.map(ingredientToRemove => {
    let newIngredient = {id: null, amount: 0}
    newIngredient.id = ingredientToRemove.id
    newIngredient.amount = ingredientToRemove.quantity.amount
    return newIngredient
  })
}

const fixRecipeData = () => {
  recipesRepository.recipeData.forEach(recipe => {
    recipe.ingredients.forEach(recipeIngredient => {
      let thing  = ingredientsRepository.ingredientsData.find(ingredient => {
        return ingredient.id === recipeIngredient.id
      })
      recipeIngredient.name = thing.name
    })
  })
  recipesRepository = recipesRepository.recipeData
}

function searchSavedRecipes(event) {
  if (event.target.className === 'search-button') {
    let searchInputValue = domUpdates.capitalize(searchInput.value)
    user.favoriteRecipes.map(favoriteRecipe => {
      let favoritedRecipe = recipesRepository.find(recipe => recipe.id === favoriteRecipe)
      if (favoritedRecipe.name.includes(searchInputValue)) {
        domUpdates.displaySearchedFavorite(favoritedRecipe)
      }
    })
  }
}

function searchSavedByIngredients(event) {
  if (event.target.className === 'search-button') {
    let searchInputValue = searchInput.value.toLowerCase()
    let searchedRecipe = user.favoriteRecipes.map(favoriteRecipe => {
      let favoritedRecipe = recipesRepository.find(recipe => recipe.id === favoriteRecipe )
      let matchedFavorites = favoritedRecipe.ingredients.reduce((acc, ingredient) => {
        if (ingredient.name.includes(searchInputValue)) {
          acc.push(favoritedRecipe)
        }
        return acc
      }, [])
      return matchedFavorites
    })
    let filtered = searchedRecipe.filter(recipe => recipe[0]).flat()
    domUpdates.displaySearchedByIngredient(filtered)
  }
  }
