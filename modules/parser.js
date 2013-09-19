var util = require('util');
var Transform = require('stream').Transform;
util.inherits(GCodeParser, Transform);

//------------------------------------------------------------------
// Class definition / inheritance
//------------------------------------------------------------------
function GCodeParser(options) {
  if (!(this instanceof GCodeParser))
    return new GCodeParser(options);

  Transform.call(this, options);

  this.array_block = [];
  this.array_strbuffer = "";
  //this.lines_counter = 0;
}

//------------------------------------------------------------------
// Prototype
//------------------------------------------------------------------
GCodeParser.prototype._transform = function(chunk, encoding, done) {

  console.log("\r\n");
  console.log("-----------------------------------------------------");
  console.log("[Transform]: Print chunck data:");
  console.log("-----------------------------------------------------");
  console.log("%s", chunk); 

  // count number of lines present in the data block
  var internalcounter = (chunk.match(/\n/g)||[]).length;
  console.log("-----------------------------------------------------");
  console.log("[Transform]: Found %d lines", internalcounter);
  console.log("-----------------------------------------------------");

  // split stream data into lines of strings (array)
  this.array_block = chunk.split("\n");
  
  // pre-adds previous partial line to the new data
  if (this.array_block.length > 0)
    this.array_block[0] = this.array_strbuffer + this.array_block[0];
//--> missing else code ???

  // test if the last line is an incomplete line, if so 
  // buffers it to be pre-added into the next data block
  this.array_strbuffer = "";
  if (this.array_block.length > 1) {
    this.array_strbuffer = this.array_block[this.array_block.length - 1];
    this.array_block.splice(this.array_block.length - 1);
  }

  //console.log("[core.js]:iStream: Preparing to print Block Data:");
  var jsonData;
  for (var i=0; i<this.array_block.length; i++) {
    //console.log("[ %s ]",this.array_block[i]);
    //jsonData = {'CMD': this.array_block[i]};
    //this.array_block[i] = JSON.stringify(jsonData);

    //this.array_block[i] = '['+this.array_block[i]+']';

    this.array_block[i] = this.array_block[i];
  }

  this.push(this.array_block.join('\n'));  

  // now, because we got some extra data, emit this first.
  /*
  if(this.array_strbuffer.length !== 0) {
    console.log("Found incomplete line data (pushing into next chunk): %s", this.array_strbuffer);
    this.push(this.array_strbuffer);
  } */

  done();
};
//------------------------------------------------------------------
// sample
//var transformStream = new GCodeParser({decodeStrings: false, size: 8, highWaterMark: 8});
//------------------------------------------------------------------

//------------------------------------------------------------------
// export
//------------------------------------------------------------------
module.exports = {
  GCodeParser: GCodeParser
};
//------------------------------------------------------------------