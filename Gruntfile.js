module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            compile: {
                files: [
                    {
                        expand: true,
                        cwd: 'websrc/',
                        src: './**/*',
                        dest: 'webdist/public/'
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

    grunt.registerTask('build', ['copy']);
    grunt.registerTask('default', ['clean', 'build']);
};