const btn = document.getElementById("togglebtn");
const box = document.getElementById("custom-box");

btn.addEventListener('click', function ()
{
    box.classList.toggle('hidden');
})