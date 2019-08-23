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
        babel: {
            options: {
                sourceMap: true,
                presets: [
                    '@babel/preset-env',
                    ['minify', {
                        builtIns: false,
                        evaluate: false,
                        mangle: false
                    }]
                ]
            },
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'websrc/js/',
                        src: './**/*.js',
                        dest: 'webdist/public/js/'
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
    grunt.loadNpmTasks('grunt-babel');

    grunt.registerTask('build', ['copy', 'babel', 'postcss']);
    grunt.registerTask('default', ['clean', 'build']);
};