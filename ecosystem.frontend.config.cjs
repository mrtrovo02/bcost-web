module.exports = {
  apps: [
    {
      name: 'bcost-web',
      cwd: '/home/ec2-user/bcost.web/bcost-web',

      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',

      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
      },

      max_memory_restart: '450M',
      autorestart: true,
      restart_delay: 5000,

      error_file: '/home/ec2-user/logs/bcost-web-error.log',
      out_file: '/home/ec2-user/logs/bcost-web-out.log',

      time: true,
    },
  ],
};
