module.exports = function() {
  return {
    visitor: {
      Program:{
        enter(path,state){
          console.log(path);
        }
      }
    },
  };
}