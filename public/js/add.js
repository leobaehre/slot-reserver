document.getElementById('logout').addEventListener('click', () => {
  fetch('/api/logout', {
    method: 'POST',
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message);
      });
    }
    return response.json();
  })
  .then(data => {
    window.location.href = "/login";
  })
  .catch(error => {
    console.error('Error logging out:', error);
  });
});

document.getElementById('back').addEventListener('click', () => {
  window.location.href = "/dashboard";
});

document.getElementById('add-timeslot-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;
  const interval = document.getElementById('interval').value;

  fetch('/api/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startTime, endTime, interval }),
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('message').textContent = data.message;
  })
  .catch(error => {
    console.error('Error adding timeslots:', error);
    document.getElementById('message').textContent = 'Error adding timeslots';
  });
});
