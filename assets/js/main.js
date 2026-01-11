// Minimal interactivity for static site
document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('contact-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      alert('This is a static demo form. Configure a backend to receive messages.');
      form.reset();
    });
  }
});
