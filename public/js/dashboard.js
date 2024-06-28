const availableTable = document.getElementById('available');
const reservedTable = document.getElementById('reserved');

document.addEventListener('DOMContentLoaded', () => {
  fetchData('/api/available', availableTable, ['Date', 'Time']);
  fetchData('/api/reservations', reservedTable, ['Date', 'Time', 'Email']);
});

function fetchData(url, table, headers) {
  fetch(url)
    .then(response => response.json())
    .then(data => {
      renderTable(data, table, headers);
    })
    .catch(error => {
      console.error(`Error fetching data from ${url}:`, error);
    });
}

function renderTable(data, table, headers, type) {
  table.innerHTML = `
    <tr>
      <th style="width: 15px"></th>
      ${headers.map(header => `<th>${header}</th>`).join('')}
    </tr>
  `;
  const fragment = document.createDocumentFragment();
  let gray = true;
  sortData(data);
  data.forEach(item => {
    const row = document.createElement('tr');
    row.id = type === 'available' ? `available-${item.id}` : `reserved-${item.id}`;
    row.innerHTML = `
      <td><input type="checkbox" name="slot" value="${item.id}"></td>
      ${headers.map(header => `<td>${item[header.toLowerCase()]}</td>`).join('')}
    `;
    row.style.backgroundColor = gray ? "lightgray" : "white";
    gray = !gray;
    fragment.appendChild(row);
  });
  table.appendChild(fragment);
}

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

document.getElementById('delete-timeslot').addEventListener('click', () => {
  const selectedSlots = Array.from(document.querySelectorAll('#available input[name="slot"]:checked'))
    .map(checkbox => checkbox.value);
  if (selectedSlots.length === 0) return;
  deleteTimeslots(selectedSlots);
});

// get list of ids of selected slots, I put the id of the slot in the checkbox value
document.getElementById('cancel-reservation').addEventListener('click', () => {
  const selectedSlots = Array.from(document.querySelectorAll('#reserved input[name="slot"]:checked'))
    .map(checkbox => checkbox.value);
  if (selectedSlots.length === 0) return;
  cancelReservations(selectedSlots);
});

function deleteTimeslots(slots) {
  fetch('/api/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slots }),
  })
  .then(response => response.json())
  .then(data => {
    window.location.reload();
  })
  .catch(error => {
    console.error('Error deleting timeslots:', error);
  });
}

function cancelReservations(slots) {
  fetch('/api/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slots }),
  })
  .then(response => response.json())
  .then(data => {
    window.location.reload();
  })
  .catch(error => {
    console.error('Error canceling reservations:', error);
  });
}

document.getElementById('add').addEventListener('click', () => {
  window.location.href = "/dashboard/add";
});

function sortData(data) {
  data.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  });
}
