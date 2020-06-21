const devLog = console.log;
//fetch("https://tambomas.pe/public/api/promos/").then(devLog);
//fetch("https://tambomas.pe/public/api/promos/5ed91f542f9b90412f68337b").then(devLog);
const getJSON = (url) =>
  fetch(url, { headers: { Accept: "application/json" } });

const data = getJSON("data.json").then((r) => r.json());

const search = document.getElementById("search");
const searchBtn = document.getElementById("searchnow");
const promo_data = getJSON("promo_data.json").then((r) => r.json());

function makeModal(promoData) {
  const {
    categories,
    description,
    name,
    photo,
    _price,
    _ogprice,
    dateTo,
    discount,
  } = promoData;

  return `<div class="result result-modal-data">
  <span class="modal-close">X</span>
  <div class="img-wrapper result-modal-img">
      <img src="https://tambomas.pe/${photo}" width="100%">
      <p class="result-discount">${discount}% dscto.</p>
  </div>
  <div class="result-full-data">
      <span class="result-category">Categoria: ${categories}</span>
      <h2 class="result-title">${name}</h2>
      <p class="result-description">${description}</p>
      <p class="result-price">S/. ${_price}</p>
      <small class="ref-price">Precio ref. S/. ${_ogprice.toFixed(
        2
      )}</small> <br>
      <small class="ref-price">Fecha limite: ${dateTo.substring(0, 10)}</small>
  </div>
</div>`;
}

function showResultModal(_event) {
  const modal = document.getElementById("result-modal");
  /* if (this != _event.target) return */
  if (modal.loading) return;
  modal.loading = true;
  promo_data
    .then(addPromoMetadata)
    .then((promo) => {
      modal.onclick = function (e) {
        if (e.target == this) modal.style.display = null;
      };
      modal.innerHTML = makeModal(promo);
      modal.querySelector(".modal-close").onclick = modal.onclick;
      modal.style.display = "block";
      //console.log(this.dataset.id);
    })
    .finally(() => (modal.loading = false));
}

function FavoritesManager(promos) {
  let favorites = [];
  const container = document.querySelector(".favorites");
  const list = document.querySelector(".favorites ul");

  function createFavorite(promo) {
    const { _id: promoId, name, photo, price } = promo;
    const html = `<li data-promo-id=${promoId}>
    <div class="favorite">
      <div class="img-wrapper">
         <img width="100%" src="https://tambomas.pe/${photo}">
      </div>
      <p class="result-title">${name}</p>
      <span class="result-price">${price}</span>
      <span class="favorite-remove-btn">x</span>
    </div>
   </li>
   `;
    return { promoId, html };
  }

  function renderFavorites() {
    if (favorites.length) {
      container.style.display = "block";
      list.innerHTML = favorites.map((f) => f.html).join("");

      const createRemove = (id) =>
        function (e) {
          e.stopPropagation();
          removeFavorite(id);
        };

      [...list.children].forEach(
        (favorite) => (favorite.onclick = showResultModal)
      );
      list
        .querySelectorAll(".favorite-remove-btn")
        .forEach((closeBtn, id) => (closeBtn.onclick = createRemove(id)));
      return;
    }
    container.style.display = null;
  }
  function removeFavorite(index) {
    favorites = favorites.filter((_, id) => id !== index);
    renderFavorites();
  }
  function addFavorite(promoId) {
    const promo = promos.find((promo) => promo._id === promoId);
    if (favorites.find((f) => f.promoId == promoId)) return;
    favorites.push(createFavorite(promo));
    renderFavorites();
  }
  return {
    addFavorite,
  };
}

function drawResults(data) {
  const container = document.querySelector(".results");
  const { promos } = data;
  const results = container.cloneNode();
  const favorites = new FavoritesManager(promos);
  //devLog(results);
  results.innerHTML = promos.map(resultToHTML).join("");
  // attach event listeners
  const createAddFavorite = (promoId) => () => favorites.addFavorite(promoId);

  [...results.children].forEach(
    (result) => (result.onclick = createAddFavorite(result.dataset.id))
  );

  container.parentElement.replaceChild(results, container);

  function resultToHTML({ _id, name, _ogprice, price, discount, photo }) {
    const totalDiscount = discount
      ? `<p class="result-discount">${discount}% dscto.</p>`
      : "";
    const resultPrice = price ? `<p class="result-price">${price}</p>` : "";
    const originalPrice = _ogprice
      ? `<small class="ref-price">Precio ref. S/. ${_ogprice.toFixed(
          2
        )}</small>`
      : "";
    return `<div class="result" data-id="${_id}">
      <div class="img-wrapper">
        <img width="100%" src="https://tambomas.pe/${photo}">
        ${totalDiscount}
      </div>
      <h2 class="result-title">${name}</h2>
      ${resultPrice}
      ${originalPrice}
      </div>`;
  }
}

function addPromoMetadata(promo) {
  const desc_price_rx = /(?:S\/)?(\d+\.\d{2})/;
  const price_rx = /(\d+(?:\.\d+))/;

  function extractPrice(price, regex) {
    const found = price.match(regex);
    if (found) return Number(found[1]);
    return price;
  }

  const hasValidPrice = (str, regx) => regx.test(str);
  if (hasValidPrice(promo.price, price_rx)) {
    promo._price = extractPrice(promo.price, price_rx);
  }
  if (hasValidPrice(promo.description, desc_price_rx)) {
    promo._ogprice = extractPrice(promo.description, desc_price_rx);
  }
  if (promo._price && promo._ogprice) {
    const { _price, _ogprice } = promo;
    promo.discount = parseInt(((_ogprice - _price) * 100) / _ogprice);
  }

  return promo;
}

const addMetadata = (data) => {
  data.promos.forEach(addPromoMetadata);
  return data;
};

data.then(addMetadata).then(drawResults);

function throttle(fn, timeMs) {
  let lastCall = 0;
  return function (...params) {
    if (Date.now() - lastCall < timeMs) {
      devLog("not yet");
      return;
    }
    fn(...params);
    lastCall = Date.now();
  };
}

function maybeDebounce(fn, timeMs) {
  let executeAt = 0,
    shouldRunTimer = null,
    ranOnce = false,
    ranOnceTimer = false;

  return function (...params) {
    executeAt = Date.now() + timeMs;
    //devLog("function was called");
    if (!ranOnce) {
      ranOnce = true;
      //devLog("running once");
      //reset state
      ranOnceTimer = setTimeout(() => (ranOnce = false), timeMs);
      return fn(...params);
    }
    // cancel inc state reset
    clearTimeout(ranOnceTimer);
    //There's already a timer set
    if (shouldRunTimer !== null) {
      executeAt = Date.now() + timeMs;
      //devLog("timer was already set, resetting");
      return;
    }
    // check every .1 secs if we have to run the function
    shouldRunTimer = setInterval(() => {
      if (Date.now() >= executeAt) {
        // reset everything
        clearInterval(shouldRunTimer);
        shouldRunTimer = null;
        ranOnce = false;
        //devLog("running now...");
        fn(...params);
      }
    }, 100);
  };
}

const inputLogger = (ev) => devLog("typed", ev.target.value);
function maybeSearch(event) {
  const input = event.target.value.toLowerCase();
  const hasQuery = (promo) =>
    promo.description.toLowerCase().indexOf(input) != -1;
  data.then(({ promos }) => {
    const result = promos.filter(hasQuery);
    drawResults({ promos: result });
  });
}
search.addEventListener("input", maybeDebounce(maybeSearch, 700));
