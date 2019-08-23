module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            compile: {
                files: [
                    {
                        expand: true,
                        cwd: 'websrc/static/',
                        src: './**/*',
                        dest: 'webdist/public/'
                    },
                    {
                        expand: true,
                        cwd: 'websrc/js/',
                        src: './**/*',
                        dest: 'webdist/public/js/'
                    },
                    {
                        expand: true,
                        cwd: 'websrc/views/',
                        src: './**/*',
                        dest: 'webdist/public/views/'
                    }
                ]
            }
        },
        postcss: {
            options: {
                map: true,
                processors: [
                    require('autoprefixer')(), // ! browserlist moved to package.json
                    require('cssnano')()
                ]
            },
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'websrc/css/',
                        src: './**/*.css',
                        dest: 'webdist/public/css/'
                    }
                ]
            }
        },
        clean: ['webdist/'],
        watch: {
            websrc: {
                files: ['websrc/**/*'],
                tasks: ['copy']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-postcss');

    grunt.registerTask('build', ['copy', 'postcss']);
    grunt.registerTask('default', ['clean', 'build']);
};