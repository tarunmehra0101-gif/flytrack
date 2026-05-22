fetch('https://api.github.com')
  .then(res => console.log('Network access works! Status:', res.status))
  .catch(err => console.error('Network access failed:', err));
