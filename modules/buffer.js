//------------------------------------------------------------------
// sample:
// var Buffer = require('./buffer.js').GCodeBuffer;
// var buffer = new Buffer({slots: 10, maxbufferslots: 3});
// buffer.pushData([1,2,3,4,5,6]);
// buffer.pushData(["Hello","World","of","goo"]);
// buffer.pushData(["a","b","c"]);
// buffer.pushData(["d","e","f"]);

// var rdata;
// while((rdata=buffer.getCursorData())!= undefined)
//   console.log("[serial.js]: DATA=%s", rdata);
//------------------------------------------------------------------

//------------------------------------------------------------------
// Class definition / inheritance
//------------------------------------------------------------------
function GCodeBuffer(options) {
  if (!(this instanceof GCodeBuffer))
    return new GCodeBuffer(options);

  this.numberSlots = 10;
  if (options.slots != undefined && options.slots >= 2) {
    console.log("[buffer.js]: Found NumberOfSlots configuration: %d", options.slots);
    this.numberSlots = options.slots;
  }

  this.maxBufferSlots = 3;
  if (options.maxbufferslots != undefined && options.maxbufferslots >= 2) {
    console.log("[buffer.js]: Found MaxBufferSlots configuration: %d", options.maxbufferslots);
    this.maxBufferSlots = options.maxbufferslots;
  }  
  // test safeguard
  if (this.maxBufferSlots >= (this.numberSlots-1)) {
    console.log("[buffer.js]: Found possible error while assigning maxBufferSlots: %d", this.maxBufferSlots);
    this.maxBufferSlots = (this.numberSlots-2);
    console.log("[buffer.js]: Setting new value for maxBufferSlots: %d", this.maxBufferSlots);
  }

  //this._bufferCursor = 0;
  this._bufferCursor = 9;

  // base definition of the circular buffer and internal object
  this.circularArray = [];
  for (var i=0; i<this.numberSlots; ++i) {
    var emptyArray = [];
    var jsonObj = {    
      '_cursor': 0,
      '_blockArray': emptyArray,
      'getBlockSize': 
        function() { 
          return this._blockArray.length; 
        },
      'getBlockData': 
        function() { 
          return this._blockArray;
        },
      'setBlockData': 
        function(idata) { 
          if (idata != undefined) {
            this._blockArray = idata;
            this._cursor = 0;
          }
        }, 
      'resetBlockData': 
        function() { 
            this._blockArray.length = 0;
            this._cursor = 0;
        },         
      'getCursorData': 
        function() { 
          var data = undefined;
          if (this._cursor < this.getBlockSize()) {
            data = this._blockArray[this._cursor]; 
            this._cursor++; 
          }
          return data;
        },        
      'isBlockDataEmpty': 
        function() { 
          if (this.getBlockSize() > 0)
            return false;
          return true;
        },                                                       
      'isEndOfCursor': 
        function() { 
          if (this._cursor < this.getBlockSize())
            return false;
          return true;
        },        
    };
    this.circularArray[i] = jsonObj; 
  }
  // tests
  /*
  this.circularArray[0].setBlockData([1,2,3,4,5]);
  this.circularArray[0]._cursor = 1; //should return '2'

  this.circularArray[1].setBlockData(["Hello","World","123"]);
  this.circularArray[1]._cursor = 2; //should return '123'

  if (this.circularArray[1].isBlockDataEmpty())
    console.log("Array1 is empty");

  if (this.circularArray[2].isBlockDataEmpty())
    console.log("Array2 is empty");

  for (var i=0; i<this.numberSlots; ++i) {
    for (var j=0; j<this.circularArray[i].getBlockSize(); ++j) {
    console.log("circularArray[%d]=%s", i, this.circularArray[i]._blockArray[j]);
    }
  }

  for (var i=0; i<this.numberSlots; ++i) {
    while (!this.circularArray[i].isEndOfCursor())
      console.log("circularArray[%d]=%s", i, this.circularArray[i].getCursorData());
  } */
};

//------------------------------------------------------------------
// Prototype
//------------------------------------------------------------------
GCodeBuffer.prototype.isEmpty = function() {
  var result = true;

  for (var i=0; i<this.numberSlots; ++i) {
    if (!this.circularArray[i].isBlockDataEmpty()) {
      console.log("[buffer.js]: Buffer NOT empty!!!");
      result = false;
      break;
    }
  }  
  return result;
};

GCodeBuffer.prototype.isFull = function() {
  var result = false;
  var counter = 0;

  for (var i=0; i<this.numberSlots; ++i) {
    if (!this.circularArray[i].isBlockDataEmpty()) {
      counter++;
    }
  }  
  if (counter >= this.maxBufferSlots) {
    console.log("[buffer.js]: Buffer is full!");
    result = true;
  }

  return result;
};

GCodeBuffer.prototype.pushData = function(idata) {

  // check if idata is an 'object' (array)
  if (typeof idata == undefined || typeof idata !=="object") {
    console.log("[buffer.js]: idata not an OBJECT!");
    return false;
  }
  
  // check if buffer is full
  if (this.isFull())
    return false;

  // check if buffer is empty, if so set data to current cursor
  if (this.isEmpty()) {
    console.log("[buffer.js]: Empty Buffer, setting data to current cursor: %d [%s]", this._bufferCursor, "[...]"/*idata*/);
    this.circularArray[this._bufferCursor].setBlockData(idata);
  }
  else {
    var icursor = 0;
    var counter = 0;
    var nextBufferCursor = 0;
    
    for (var i=0; i<this.maxBufferSlots; ++i) {
      icursor = this._bufferCursor+i; 
      // check if cursor has passed the end od the circular buffer, if so ajust it's position from 0
      if (icursor >= this.numberSlots)
        icursor = icursor - this.numberSlots;
      // note: if this.maxBufferSlots is near the this.maxBufferSlots there may be a problem overlapping ... you have been warned!!! 

      if (this.circularArray[icursor].isBlockDataEmpty()) {
        console.log("[buffer.js]: Found free buffer at cursor: %d", icursor);
        break;
      }
      else {
        console.log("[buffer.js]: Buffer at cursor %d currently in use!", icursor);
        counter++;
      }
    }

    // test if there is a free buffer
    if (counter < this.maxBufferSlots) {
      console.log("[buffer.js]: Setting data to buffer at cursor: %d [%s]", icursor, "[...]"/*idata*/);
      this.circularArray[icursor].setBlockData(idata);
    }
    else {
      console.log("[buffer.js]: Failed to get a free buffer: ERROR!");
      return false;
    }
  }
  return true;
};

GCodeBuffer.prototype.getCursorData = function() {

  // check if buffer is empty, if so set data to current cursor
  if (this.isEmpty()) {
    console.log("[buffer.js]: Empty Buffer, can not send data");
    return undefined;
  }
  var rdata;
  rdata = this.circularArray[this._bufferCursor].getCursorData();

  // test if current buffer reached the "EndOfBuffer" mark
  if (this.circularArray[this._bufferCursor].isEndOfCursor()) {
    console.log("[buffer.js]: Current buffer is now marked as EndOfBuffer! Free buffer block!!!");
    this.circularArray[this._bufferCursor].resetBlockData();

    // increment this._bufferCursor and check if requires adjustment due to circular buffer index
    var icursor = this._bufferCursor+1; 
    // check if cursor has passed the end od the circular buffer, if so ajust it's position from 0
    if (icursor >= this.numberSlots)
      icursor = icursor - this.numberSlots;
    // note: if this.maxBufferSlots is near the this.maxBufferSlots there may be a problem overlapping ... you have been warned!!!     

    console.log("[buffer.js]: Setting Cursor to %d", this._bufferCursor);
    this._bufferCursor = icursor;
  }

  return rdata;
};
//------------------------------------------------------------------
// export
//------------------------------------------------------------------
module.exports = {
  GCodeBuffer: GCodeBuffer
};
//------------------------------------------------------------------
