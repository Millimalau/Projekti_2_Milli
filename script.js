// The Movie Database (TMDB) -rajapinta: https://developer.themoviedb.org
const API_KEY = "7000faf1d985313ef3469442fb4f04b6";
const API_URL = "https://api.themoviedb.org/3";
const KUVA_URL = "https://image.tmdb.org/t/p/w500";
const ELOKUVA_URL = "https://www.themoviedb.org/movie/";
const KORTTEJA_KERRALLA = 6;

const listaValinta = document.getElementById("listaValinta");
const hakukentta = document.getElementById("hakukentta");
const elokuvatAlue = document.getElementById("elokuvat");
const viesti = document.getElementById("viesti");
const lisaaNappi = document.getElementById("lisaaNappi");

let tulokset = [];            // tähän mennessä haetut elokuvat
let sivu = 0;                 // viimeksi haettu TMDB:n sivu (20 elokuvaa / sivu)
let sivuja = 0;               // sivujen kokonaismäärä
let naytettyMaara = KORTTEJA_KERRALLA;
let hakuAjastin = null;       // viivästää hakua, kun kirjoitetaan
let hakuNumero = 0;           // estää vanhan haun vastauksen ylikirjoittamasta uutta

// ---------- Haku rajapinnasta ----------

async function haeJson(polku, parametrit) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    language: "fi-FI",
    ...parametrit
  });
  const vastaus = await fetch(API_URL + polku + "?" + params);
  if (vastaus.status === 401) {
    throw new Error("API-avain ei kelpaa");
  }
  if (!vastaus.ok) {
    throw new Error("Haku epäonnistui: " + vastaus.status);
  }
  return vastaus.json();
}

// Hakusanalla haetaan nimellä, muuten valitusta listasta
function haeSivu(sivunumero) {
  const hakusana = hakukentta.value.trim();
  if (hakusana) {
    return haeJson("/search/movie", {
      query: hakusana,
      page: sivunumero,
      include_adult: "false"
    });
  }
  return haeJson("/movie/" + listaValinta.value, {
    page: sivunumero,
    region: "FI"
  });
}

async function aloitaHaku() {
  const numero = ++hakuNumero;
  viesti.textContent = "Ladataan elokuvia...";
  elokuvatAlue.innerHTML = "";
  lisaaNappi.hidden = true;
  tulokset = [];
  sivu = 0;
  sivuja = 0;
  naytettyMaara = KORTTEJA_KERRALLA;

  try {
    const data = await haeSivu(1);
    if (numero !== hakuNumero) return;
    sivu = 1;
    sivuja = data.total_pages;
    tulokset = data.results;
    piirraElokuvat();
  } catch (virhe) {
    if (numero !== hakuNumero) return;
    viesti.textContent = "Elokuvien haku epäonnistui: " + virhe.message;
    console.error("Elokuvien haku epäonnistui:", virhe);
  }
}

// ---------- Piirtäminen ----------

function piirraElokuvat() {
  elokuvatAlue.innerHTML = "";

  if (tulokset.length === 0) {
    viesti.textContent = "Ei elokuvia valitulla haulla.";
    lisaaNappi.hidden = true;
    return;
  }

  viesti.textContent = "";
  for (const elokuva of tulokset.slice(0, naytettyMaara)) {
    elokuvatAlue.appendChild(luoKortti(elokuva));
  }

  // Nappi näkyy, jos on vielä näyttämättömiä elokuvia tai hakemattomia sivuja
  lisaaNappi.hidden = naytettyMaara >= tulokset.length && sivu >= sivuja;
}

// Rakentaa yhden kortin DOM-elementteinä
function luoKortti(elokuva) {
  const kortti = document.createElement("section");
  kortti.className = "card";

  let kuva;
  if (elokuva.poster_path) {
    kuva = document.createElement("img");
    kuva.src = KUVA_URL + elokuva.poster_path;
    kuva.alt = elokuva.title;
    kuva.loading = "lazy";
  } else {
    kuva = document.createElement("div");
    kuva.textContent = "Ei julistetta";
    kuva.classList.add("ei-kuvaa");
  }
  kuva.classList.add("card-img-top");

  const runko = document.createElement("div");
  runko.className = "card-body";

  const tekstit = document.createElement("div");

  const otsikko = document.createElement("h4");
  otsikko.className = "card-title";
  otsikko.textContent = elokuva.title;
  tekstit.appendChild(otsikko);

  if (elokuva.release_date) {
    const vuosi = document.createElement("p");
    vuosi.className = "card-vuosi";
    vuosi.textContent = elokuva.release_date.slice(0, 4);
    tekstit.appendChild(vuosi);
  }

  const nappi = document.createElement("a");
  nappi.className = "btn";
  nappi.href = ELOKUVA_URL + elokuva.id + "?language=fi-FI";
  nappi.target = "_blank";
  nappi.rel = "noopener";
  nappi.textContent = "Siirry elokuvaan";

  runko.append(tekstit, nappi);
  kortti.append(kuva, runko);
  return kortti;
}

// ---------- Tapahtumankäsittelijät (lisätään dynaamisesti) ----------

listaValinta.addEventListener("change", function () {
  hakukentta.value = "";   // lista vaihtuu -> tyhjennetään hakusana
  aloitaHaku();
});

hakukentta.addEventListener("input", function () {
  clearTimeout(hakuAjastin);
  hakuAjastin = setTimeout(aloitaHaku, 400);   // haetaan, kun kirjoitus tauolla
});

lisaaNappi.addEventListener("click", async function () {
  lisaaNappi.disabled = true;
  try {
    // Jos haetut elokuvat eivät riitä seuraavaan kuuteen, haetaan seuraava sivu
    if (naytettyMaara + KORTTEJA_KERRALLA > tulokset.length && sivu < sivuja) {
      const numero = hakuNumero;
      const data = await haeSivu(sivu + 1);
      if (numero !== hakuNumero) return;
      sivu += 1;
      tulokset = tulokset.concat(data.results);
    }
    naytettyMaara += KORTTEJA_KERRALLA;
    piirraElokuvat();
  } catch (virhe) {
    viesti.textContent = "Lisäelokuvien haku epäonnistui: " + virhe.message;
    console.error(virhe);
  } finally {
    lisaaNappi.disabled = false;
  }
});

// ---------- Käynnistys ----------

aloitaHaku();