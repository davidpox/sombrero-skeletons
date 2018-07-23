// Aliases for convenience
let Application = PIXI.Application,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    texturecache = PIXI.utils.TextureCache,
    TextStyle = PIXI.TextStyle,
    Text = PIXI.Text,
    AnimatedSprite = PIXI.extras.AnimatedSprite,
    Sprite = PIXI.Sprite;

// Global Variables
let app, mainatlas, snowBlock, character, healthBar, coin_anim, state, txtScore, txtHighScore;
let character_anim = [], enemy_anim = [];    // Character Animations 0 = left, 1 = right, 2 = up, 3 = down
let enemyArray = [], coinArray = [];
let score = 0, healthDisplayCounter = 0, timer = 0;
let menuScene, gameScene, endScene;
let dootSound;

let WIDTH = 864;    // Game Size
let HEIGHT = 900;

//Keyboard codes
let left = keyboard(37),    // Creating key objects for controls
    up = keyboard(38),
    right = keyboard(39),
    down = keyboard(40);

function init() {
    let type = "WebGL";      // Finding the PixiJS renderer (Canvas/WebGL) and seeing if PixiJS is loaded.
    if(!PIXI.utils.isWebGLSupported()) {
        type = "canvas";
    }
    PIXI.utils.sayHello(type);
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;    // Setting the scaling mode to Nearest Neighbour for crisp pixel-art resizing
    
    // Main App Init
    app = new Application({
        width: WIDTH, 
        height: HEIGHT,
        antialias: true,
        transparent: false,
        resolution: 1
    });

    app.ticker.add(gameLoop, this);         // Adding a ticker object to create a timer;

    document.getElementById("game").appendChild(app.view);  // Adding the stage to the HTML div

    menuScene = new PIXI.Container();   // Create three scenes to add various elements into
    app.stage.addChild(menuScene);

    gameScene = new PIXI.Container();
    app.stage.addChild(gameScene);

    endScene = new PIXI.Container();
    app.stage.addChild(endScene);

    // Loader is used for loading extenal assets. 
    loader 
        .add("images/texture_atlas.json")
        .load(setup);

    // use the sound.js library for enemy sound effect
    sounds.load([
        "sounds/SKULL TRUMPET.mp3"
    ]);
    sounds.whenLoaded = () => {
        dootSound = sounds["sounds/SKULL TRUMPET.mp3"]; // Initialise the sound into a global variable when loaded. 
    }
}

function setup() {

    // Create our Atlas object to retrieve textures from
    mainatlas = resources["images/texture_atlas.json"].textures;

    // Creating our first sprite from a simple image
    let background = new Sprite(mainatlas["background.png"]);
    gameScene.addChild(background);
    
    // The states our animations can be in, in the atlas.
    let characterStates = ["cleft/character_walk_left_0", "cright/character_walk_right_0", "cup/character_walk_up_0", "cdown/character_walk_down_0"];
    let enemyStates = ["eleft/enemy_walk_left_0", "eright/enemy_walk_right_0", "eup/enemy_walk_up_0", "edown/enemy_walk_down_0"];

    // Loading character animations
    for (let j = 0; j < 4; j++) {   // For every state
        let animArray = [], enemyAnimArray = [];
        for (let i = 1; i <= 9; i++) {  // Each animation consists of 9 frames
            animArray.push(PIXI.Texture.fromFrame(characterStates[j] + i + '.png'));    // Adding each of the 9 frames in the atlas to the animation object
            enemyAnimArray.push(PIXI.Texture.fromFrame(enemyStates[j] + i + '.png'));   
        }
        character_anim.push(new AnimatedSprite(animArray, true));       // Create a new Animated sprite with the 9 frames
        enemy_anim.push(new AnimatedSprite(enemyAnimArray, true));
    }

    // Creating the coin animation
    let coinAnimArray = [];
    for (let i = 1; i <= 9; i++) {
        coinAnimArray.push(PIXI.Texture.fromFrame("coin/spinning_coin_0" + i + ".png"));    // As above but for a gold coin, but no states. 
    }
    coin_anim = new AnimatedSprite(coinAnimArray, true);

    //Creating our Character from the AnimatedSprite. 
    character = new AnimatedSprite(character_anim[0].textures);
    character.scale.set(1.4);
    character.animationSpeed = 0.2;
    character.vx = 0;
    character.vy = 0;
    character.health = 100;
    gameScene.addChild(character);

    // Create 15 Skelton enemies with a random position, velocity and damage.
    for (let i = 0; i < 15; i++) {
        let t = new AnimatedSprite(enemy_anim[0].textures);
        t.scale.set(1.4);
        t.position.set(randomInt(48, background.width - 48 - t.width), randomInt(48, background.height - 48 - t.height));
        t.animationSpeed = 0.2;
        t.vx = randomFloat(-1, 1);
        t.vy = randomFloat(-1, 1);
        t.attackDamage = randomInt(1, 10);
        t.attackCooldown = 0;
        t.play();
        enemyArray.push(t);
        gameScene.addChild(t);
    }

    menuScene.visible = true;
    gameScene.visible = false;
    endScene.visible = false;
    createControls();
    createUI();
    generateCoins();

    app.ticker.add(delta => gameLoop(delta));   // Create a gameloop
    state = "menu";
}

function createControls() {
    // Keyboard controls for the character
    left.press = () => {
        character.textures = character_anim[0].textures;
        character.play();
        character.vx = -2;
    }
    left.release = () => {
        if(!right.isDown) character.vx = 0;   // If the user is not going right & let go of left, stop the character
    }
    right.press = () => {
        character.textures = character_anim[1].textures;
        character.play();
        character.vx = 2;
    }
    right.release = () => {
        if(!left.isDown) character.vx = 0;    // If the user is not going left & let go of right, stop the character
    }
    up.press = () => {
        character.textures = character_anim[2].textures;
        character.play();
        character.vy = -2;
    }
    up.release = () => {
        if(!down.isDown) character.vy = 0;    // If the user is not going down & let go of up, stop the character
    }
    down.press = () => {
        character.textures = character_anim[3].textures;
        character.play();
        character.vy = 2;
    }
    down.release = () => {
        if(!up.isDown) character.vy = 0;      // If the user is not going up & let go of down, stop the character
    }
}

// Function for creating the UI elements at the bottom.
function createUI() {

    // Global UI
    let txtWatermark = new Text("David Puetter for playerthree", {fontFamily: "Consolas", fontSize: 12, fill: "firebrick"});    // Watermark bottom right
    txtWatermark.position.set(WIDTH - txtWatermark.width, 900 - txtWatermark.height);
    app.stage.addChild(txtWatermark);

    // Menu UI
    let menuBackground = new Sprite(mainatlas["background.png"]);        // Use our color background as the menu background
    let filter = new PIXI.filters.ColorMatrixFilter();
    filter.desaturate(false);                                                           // but use a filter to desaturate it and back it B&W 
    menuBackground.filters = [filter];
    menuScene.addChild(menuBackground);

    let logo = new Sprite(mainatlas["logo.png"]);
    logo.scale.set(2);
    logo.position.set(WIDTH / 2 - logo.width / 2, HEIGHT / 2 - logo.height / 2 - 200)
    menuScene.addChild(logo);

    let btnStart = new PIXI.Graphics();                 // Custom graphics button
    btnStart.lineStyle(3, 0x151C23, 1);                 // Dark green/blue outline
    btnStart.beginFill(0x355157, 1)                     // Dark blue fill
    btnStart.drawRect(0,0, 220, 50);                    // drawing it at 220 x 50 px
    btnStart.position.set(WIDTH / 2 - btnStart.width / 2, HEIGHT / 2 - btnStart.height / 2)
    btnStart.endFill();
    btnStart.buttonMode = true;                         // allowing for interaction
    btnStart.interactive = true;
    btnStart.on('pointerdown', () => {                  // if its pressed, start the game, hide the menu, reveal the game
        menuScene.visible = false;
        gameScene.visible = true;
        state = "playing";
    });

    let txtStart = new Text("Start Game", {fontFamily: "Consolas", fontSize: 24, fill: "white"});
    btnStart.addChild(txtStart);
    txtStart.position.set(txtStart.parent.width / 2 - txtStart.width / 2, txtStart.parent.height / 2 - txtStart.height / 2);

    menuScene.addChild(btnStart);

    // Game UI
    let healthIcon = new Sprite(mainatlas["healthIcon.png"]);        // + Health Icon
    healthIcon.position.set(20, HEIGHT - healthIcon.height);
    gameScene.addChild(healthIcon);

    let coinIcon = new Sprite(mainatlas["goldCoinStatic.png"]);      // Coin Icon
    coinIcon.scale.set(1.5);
    coinIcon.position.set(270, HEIGHT - coinIcon.height);
    gameScene.addChild(coinIcon);
    
    coinsCollected = new Text("0", {fontFamily: "Consolas", fontSize: 25, fill: "white"});  // Coin Label
    coinsCollected.position.set(coinIcon.position.x + coinIcon.width + 10, coinIcon.position.y);
    gameScene.addChild(coinsCollected);

    healthBar = new PIXI.Graphics();                                                        // Red Healthbar
    healthBar.beginFill(0xFF0000, 1);
    healthBar.position.set(healthIcon.position.x + healthIcon.width + 10, healthIcon.position.y, 100, 25);
    healthBar.drawRect(0, 0, 200, 25);
    healthBar.endFill();
    gameScene.addChild(healthBar);

    healthDisplayCounter = new Text("100 HP", {fontFamily: "Consolas", fontSize: 15, fill: "white"}); // Health Label
    healthDisplayCounter.position.set((healthBar.position.x + healthBar.width / 2) - healthDisplayCounter.width / 2, (healthBar.position.y + healthBar.height / 2) - healthDisplayCounter.height / 2);
    gameScene.addChild(healthDisplayCounter);

    // End Screen UI
    let txtGameOver = new Text("You died! :(", {fontFamily: "Consolas", fontSize: 48, fill: "white"});  
    txtGameOver.position.set(WIDTH / 2 - txtGameOver.width / 2, HEIGHT / 2 - txtGameOver.height / 2);
    endScene.addChild(txtGameOver);

    txtScore = new Text("You managed to collect " + score + " coins! Nice job!", {fontFamily: "Consolas", fontSize: 24, fill: "white"});
    txtScore.position.set(WIDTH / 2 - txtScore.width / 2, (HEIGHT / 2 - txtScore.height / 2) + txtGameOver.height + 20);
    endScene.addChild(txtScore);

    txtHighScore = new Text("Your highest ever is 0", {fontFamily: "Consolas", fontSize: 20, fill: "white"});
    txtHighScore.position.set(WIDTH / 2 - txtHighScore.width / 2, txtScore.position.y + 40);
    endScene.addChild(txtHighScore);
}

// Contains the entity within a given boundary
function containEntity(entity, minX, maxX, minY, maxY) {
    let collision = "none";

    if(entity.x + entity.width > maxX) {        // if the entities x + width (top right of entity) surpasses the limit
        entity.x = maxX - entity.width;         // Just reset it back to the max boundary limit
        collision = "right";
    }
    if(entity.x < minX) {                       // if the entities x is lower than the min boundary
        entity.x = minX;                        // Just reset it back to the min boundary limit
        collision = "left";
    }

    if(entity.y + entity.height > minY) {       // Same as above but for the Y axis 
        entity.y = minY - entity.height;
        collision = "bottom";
    }
    if(entity.y < maxY) {
        entity.y = maxY;
        collision = "top";
    }
    return collision;
}

function checkCollision(entity1, entity2) {
    let x = entity1.x < (entity2.x + entity2.width) && (entity1.x + entity1.width) > entity2.x;     // Checks collision on X-axis
    let y = entity1.y < (entity2.y + entity2.height) && (entity1.y + entity1.height) > entity2.y;   // Checks collision on Y-axis
    return x && y; //return true if collision on both axis is found, else return false. 
}

function generateCoins() {
    // Create random coins on the map
    for (let i = 0; i < randomInt(10, 40); i++) {
        let c = new AnimatedSprite(coin_anim.textures);
        c.scale.set(1.4);
        c.position.set(randomInt(48, 816 - c.width), randomInt(48, 816 - c.height));    // Random position
        c.animationSpeed = 0.15;
        c.play();
        coinArray.push(c)
        gameScene.addChild(c);
    }
}

// Gameloop updates 60 times per second
function gameLoop(delta) {
    if(state === "playing") playGame(delta);
}

function playGame(delta) {
    character.x += character.vx;    // Update characters position based on their velocity
    character.y += character.vy;

    enemyArray.forEach(element => { // Update every enemies position based on their velocity
        element.x += element.vx;
        element.y += element.vy;
    });

    containEntity(character, 48, WIDTH - 48, 816, 48) // Make sure that the player character does not go out of bounds 
    
    timer += app.ticker.deltaTime;      // Increase the timer by dt

    if (timer >= 1) {   // if the timer has surpassed 1, take one away from the elements cooldown. 
        timer = 0;
        enemyArray.forEach(element => {
            element.attackCooldown -= 1;
            if (element.attackCooldown <= 0) element.attackCooldown = 0;
        });
    }

    enemyArray.forEach(element => {
        if(containEntity(element, 48, WIDTH - 48, HEIGHT - 84, 48) != "none") { // If the enemy hit a collision wall.
            element.vx = randomFloat(-1, 1);                // Give the enemy a random direction & power.
            element.vy = randomFloat(-1, 1);

            if ((element.vx > element.vy) && element.vx < 0) element.textures = enemy_anim[0].textures;         // Determine the direction the enemy is moving and set their animation to that direction
            else if ((element.vx > element.vy) && element.vx > 0) element.textures = enemy_anim[1].textures;
            else if ((element.vy > element.vx) && element.vy < 0) element.textures = enemy_anim[2].textures;
            else if ((element.vy > element.vx) && element.vy > 0) element.textures = enemy_anim[3].textures;

            element.play();
        }
        if(element.attackCooldown <= 0) {                   // If the enemy can attack
            if(checkCollision(character, element)) {        // Check collision with the player
                character.health -= element.attackDamage;   // Damage the player & play a sound
                dootSound.play();
                if (character.health <= 0) { endGame(); }   // If the player has no health, end the game.

                healthDisplayCounter.text = character.health + " HP";   // Update the text fields, health rectangle & reset the cooldown.
                healthBar.width = character.health * 2;
                element.attackCooldown = 300;
            }
        }
    });

    for (let coinIndex = 0; coinIndex < coinArray.length; coinIndex++) {    // Check collision for every coin against the player.
        if(checkCollision(character, coinArray[coinIndex])) {
            gameScene.removeChild(coinArray[coinIndex]);        // If a collision is found, remove the coin from scene & array, award the user a point & update counter
            coinArray.splice(coinIndex, 1);
            score++;
            coinsCollected.text = score;
            if (coinArray.length == 0) { generateCoins(); };    // If there's no more coins, generate a few more.
        }
    }

    if(!up.isDown && !down.isDown && !left.isDown && !right.isDown) {   // If no keys are being pressed, stop the character animation
        character.stop();
    }
}

function endGame() {
    if (parseInt(localStorage.getItem("highscore")) <= score || localStorage.getItem("highscore") === null) {// Is our score higher than our previous highscore? Or do we not have a highscore already?
        localStorage.setItem("highscore", score);                                                            // if so, set a new highscore
    }
    state = "end";
    gameScene.filters = [new PIXI.filters.BlurFilter()];    // Add a nice blur filter to the gameScene instead of hiding it completely 
    endScene.visible = true;

    txtScore.text = "You managed to collect " + score + " coins! Nice job!"                     // Update the text items
    txtHighScore.text = "Your highest ever is " + parseInt(localStorage.getItem("highscore"));
}

// Taken from https://github.com/kittykatattack/learningPixi
function keyboard(keyCode) {
    let key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;

    key.downHandler = event => {
        if(event.keyCode === key.code) {
            if(key.isUp && key.press) key.press();
            key.isDown = true;
            key.isUp = false;
        }
        event.preventDefault();
    }
    key.upHandler = event => {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }
        event.preventDefault();
    };

    //Attach event listeners
    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    );
    return key;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
