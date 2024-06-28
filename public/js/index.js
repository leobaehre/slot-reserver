const slotsSelect = document.getElementById('slots');
const emailInput = document.getElementById('email');
const reservationForm = document.getElementById('reservationForm');

document.addEventListener('DOMContentLoaded', () => {
  fetchAvailableDates().then(availableDates => {

    $("#date").datepicker({
      beforeShowDay: function(date) {
        const dateString = $.datepicker.formatDate('yy-mm-dd', date);
        return [availableDates.includes(dateString), ''];
      },
      onSelect: function(dateText) {
        const formattedDate = new Date(dateText);
        formattedDate.setDate(formattedDate.getDate() + 1);
        const date = formattedDate.toISOString().split('T')[0];
        fetchAvailableSlots(date);
      }
    });
  });
});

function fetchAvailableDates() {
  return fetch('/api/available-dates')
    .then(response => response.json())
    .then(data => {
      return data.dates;
    })
    .catch(error => {
      console.error('Error fetching available dates:', error);
      return [];
    });
}

function fetchAvailableSlots(date) {
  fetch(`/api/available/${date}`)
    .then(response => response.json())
    .then(data => {
      slotsSelect.innerHTML = '';
      data.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot.id;
        option.textContent = slot.time;
        slotsSelect.appendChild(option);
      });
      slotsSelect.disabled = false;
    })
    .catch(error => {
      console.error('Error fetching slots:', error);
      slotsSelect.innerHTML = '<option value="">Error loading slots</option>';
    });
}

reservationForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const slotid = slotsSelect.value;
  const email = emailInput.value;

  console.log('Reserving slot:', slotid, email);

  fetch('/api/reserve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slotid, email }),
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
    console.log(data);
    window.location.href = "/success";
  })
  .catch(error => {
    console.error('Error reserving slot:', error);
  });
});
