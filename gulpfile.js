var gulp = require('gulp');
var concat = require('gulp-concat');

var paths = {
    outputfile: 'aj-keycloak.js',
    dep_keycloak_source: "bower_components/keycloak/dist/keycloak.js",
    dep_keycloak_minsource: "bower_components/keycloak/dist/keycloak.min.js",
    dep_src: 'src',
    src: "src/**/*",
    srcHTML: 'src/index.html',
    tmp: 'tmp',
    dist: "dist"
}

gulp.task('default', function () {
  console.log('Hello World!');
});

gulp.task('copy',function(){
    return gulp.src(paths.src).pipe(gulp.dest(paths.dist));
});

gulp.task('copyHTML',function(){
    return gulp.src(paths.srcHTML).pipe(gulp.dest(paths.dist));
});

gulp.task('concat',function(){
    return gulp.src([paths.src + 'keycloak.js', paths.src + 'index.js'])
                .pipe(concat(paths.outputfile))
                .pipe(gulp.dest(paths.dist));
})

gulp.task('setup-source',function(){
    return gulp.src(paths.dep_keycloak_source).pipe(gulp.dest(paths.dep_src));
});

// gulp.task('setup-dist',function(){
//     return gulp.src(paths.dep_keycloak_minsource).pipe(gulp.dest(paths.dep_src));
// });

gulp.task('build',['setup-source','concat','copyHTML']);
