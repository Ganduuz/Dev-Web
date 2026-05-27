fetch("http://localhost:3000/missions")
  .then(res => res.json())
  .then(data => console.log(data));