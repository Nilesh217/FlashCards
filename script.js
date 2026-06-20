const plusCircle = document.querySelector('.plus-circle');
const cardContainer = document.querySelector('.card-container');
plusCircle.addEventListener('click', function() {
    const newContainer = document.createElement('div');
    newContainer.className='card';
    newContainer.textContent='New Card';
    cardContainer.appendChild(newContainer);
});