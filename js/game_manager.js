function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 1;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("restartWithConfirmation", this.restartWithConfirmation.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Restart the game after user confirmation

GameManager.prototype.restartWithConfirmation = function () {
    // Open confirm message
    this.actuator.promptRestart();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
  this.actuate();
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState &&0) { // Remove &&0 when ready to use cache again...
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
	this.cantFinishHereGrid = new Grid(previousState.grid.size,
                                previousState.grid.cells);
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
	this.cantFinishHereGrid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTile();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTile = function () {
  this.curCell = new Tile({ x: 0, y: 3});
  this.curCell.type = 1;
  this.grid.insertTile(this.curCell);
};

GameManager.prototype.addBlock = function(position) {
    var tile = new Tile({ x: position.x, y: position.y });
	tile.type = 2;
    this.grid.insertTile(tile);
}

GameManager.prototype.moveCurCellAndAddBlockedCell = function(position) {

  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.type == 2) {
      tile.type = 0;
    }
  });
  
  this.addBlock({ x: this.curCell.x, y: this.curCell.y });

  this.curCell.x = position.x;
  this.curCell.y = position.y;
  
  this.grid.insertTile(this.curCell);
}

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    keepPlaying: this.keepPlaying
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
	cantFinishHereGrid:        this.cantFinishHereGrid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

GameManager.prototype.move = function (direction) {
  var self = this;
  
  if (this.isGameTerminated()) return; // Needed?
  
  var vector     = self.getVector(direction);
  var positions = self.findFarthestPosition(self.curCell, vector);
  
  if (positions.farthest.x === self.curCell.x && positions.farthest.y === self.curCell.y) {
    // Here play can't move sound
	return;
	}


	// Here play move sound

	
  self.moveCurCellAndAddBlockedCell(positions.farthest);
  
  self.score += 1;

  var availableCells = this.grid.availableCells();
  
  if (availableCells.length == 0) {
	
	self.grid.clearBlockedCells();
	
	self.cantFinishHereGrid.insertTile(self.curCell);
	
	// TODO: improve grid-clearing animation + update can't finish here grid view + check if game was completed
	//self.won = true;
  }
  else if (!self.anyDirectionAvailable() || self.cantFinishInAvailableCells(availableCells)) {
	self.over = true;
  }

  this.actuate();
};

GameManager.prototype.cantFinishInAvailableCells = function (availableCells) {
	for (var i = 0; i < availableCells.length; i++) {
		var cell = availableCells[i];
		if (!this.cantFinishHereGrid.cells[cell.x][cell.y]) {
			return false;
		}
	}
	return true;
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required - REMOVE
  };
};

GameManager.prototype.anyDirectionAvailable = function () {
	var self = this;
	for (var direction = 0; direction < 4; direction++) {
		var vector     = self.getVector(direction);
		var positions = self.findFarthestPosition(self.curCell, vector);
		if (positions.farthest.x !== self.curCell.x || positions.farthest.y !== self.curCell.y)
			return true;
	}
	return false;
}

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
