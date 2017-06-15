let app2 = new Vue({
  el: '#app-2',
  data: {
    glosowanie:2,
    helor:'hęllął',
    json:{},
    deputies:[],
  },
  created: function () {
    $.getJSON('/data/voting'+this.glosowanie,(data)=>{
      this.json = data;
      this.deputies = data.deputies;
    });
  }
});
