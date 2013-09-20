3DPrinterCloudClient
====================

Node.js 3D Printer Cloud Client (early test)

Currently running this as a command line tool to print gcode to 3d printer via node.js.

Testing with node.js v0.10.5 running on a TP-Link WR703N with OpenWrt.

WR703N is higly limited, low CPU and RAM, so it is required to launch node.js with some parameters:
```
# adjust serialport and speed in ./config/linux.json
export NODE_ENV=linux
node --stack_size=1024 --max_old_space_size=20 --max_new_space_size=2048 --max_executable_size=5 --gc_global --gc_interval=100 app.js ./bin/gcode/smallwheel.gcode
```

To send direct commands to your printer use this:
```
# adjust serialport and speed in ./config/linux.json
export NODE_ENV=linux
node --stack_size=1024 --max_old_space_size=20 --max_new_space_size=2048 --max_executable_size=5 --gc_global --gc_interval=100 app.js
```

NOTES: Cross-Compile libv8.so, Node.js, and SerialPort NPM module:
https://github.com/paul99/v8m-rb/pull/19#issuecomment-23875964

NOTE2: No NPM available, just install the modules on a Linux/Mac machine (npm update) and copy 'node_modules' to the embedded system. SerialPort need to be Cross-Compiled (check the link instructions on NOTE)

