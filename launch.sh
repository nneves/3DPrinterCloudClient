# adjust serialport and speed in ./config/linux.json
export NODE_ENV=linux
node --stack_size=1024 --max_old_space_size=20 --max_new_space_size=2048 --max_executable_size=5 --gc_global --gc_interval=100 app.js ./bin/gcode/robot_v2_support.gcode