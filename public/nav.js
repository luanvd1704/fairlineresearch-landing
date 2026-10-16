/* Nút menu trên màn hình hẹp (dưới 1180px hàng liên kết bị ẩn): bấm để mở/đóng; chọn một mục, bấm ra ngoài hoặc Esc thì đóng */
(function () {
  const nav = document.querySelector('.nav');
  const nut = nav && nav.querySelector('.nav__toggle');
  if (!nut) return;
  const dat = (mo) => {
    nav.classList.toggle('nav--mo', mo);
    nut.setAttribute('aria-expanded', String(mo));
    nut.setAttribute('aria-label', mo ? 'Đóng menu' : 'Mở menu');
  };
  nut.addEventListener('click', () => dat(!nav.classList.contains('nav--mo')));
  nav.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', () => dat(false)));
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) dat(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dat(false); });
})();
