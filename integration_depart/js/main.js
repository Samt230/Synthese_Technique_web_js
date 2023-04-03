import { createApp, ref, onMounted } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js"

/**panier */
const panier_est_ouvert = ref(false)
/**nombre d'items dans le panier ( id:nobmre ) */
const panier = ref({})
/**liste complete des items dans le panier (id , places disponibles , description , etc...) */
const produits = ref([])
/**messages d'erreur */
const message = ref(false)
/**pour faire apparaitre le bouton paypal */
const actif = ref('')
/**vérifie si il reste des places avant de l'ajouter au panier */
const indisponible = ref()
/**nombre de places restantes pour une representation */
const placesRestantes = ref(0)

/**ajoute le produit sélectionné au panier si il reste des places */
function ajouterProduit(show) {
    if (show.total_seats_left - panier.value[show.id] == 0) {
        indisponible.value = "indisponible"
        closeAll()
        return
    }
    if (panier.value[show.id] == undefined) {
        panier.value[show.id] = 1
        if (!produits.value.includes(show.id)) {
            produits.value.push(show)
        }
    } else {
        panier.value[show.id]++
    }
}

/**actualise le nombre  */
function actualisePlaces(placesDansPanier, produit) {
    placesRestantes.value = produits.value[produits.value.indexOf(produit)].total_seats_left - placesDansPanier
    return placesRestantes.value
}

/**enleve le produit sélectionné */
function enleverProduit(produit) {
    delete panier.value[produit.id]
    if (produits.value != []) {
        produits.value.splice([produits.value.indexOf(produit)], 1)
    }
    getPanierTotal()
}

/**vide le panier */
function viderPanier() {
    panier.value = {}
    produits.value = []
    actif.value = ""
}

/**actualise le total du panier */
function getPanierTotal() {
    let somme = 0
    for (let id in panier.value) {
        let prix = 1.00
        let qty = panier.value[id]
        somme += prix * qty
    }
    /**pour faire apparaitre le bouton paypal */
    if (somme != 0) {
        actif.value = "actif"
    } else {
        actif.value = ""
    }
    return somme
}

/**pour sélectionner le produit choisis dans la liste de produits */
function getProduit(id) {
    for (let produit of produits.value) {
        if (produit.id == id) {
            return produit
        }
    }
}
/**fin du panier */


/**page principale */
const calendrier = ref([])
const DOMAINE = "http://jduranleau.cpsw-fcsei.com/module5/js/synthese/api/"
const jourActuel = ref(String(new Date().getDate()).padStart(2, '0'))
const moisActuel = ref('')
const nbJours = ref()
/**index du mois dans la liste moisNom */
const moisNb = ref(String(new Date().getMonth() + 1))
/**année en cours */
const annee = ref(String(new Date().getFullYear()))
/**liste des représentations */
const shows = ref([])
const moisNom = ref(["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novenbre", "Décembre"])
/**secondes depuis le 3 novembre 1971 */
const unix = ref()
/**présentations associées a la journée sélectionnée */
const dailyShows = ref()

/**initialise le calendrier */
getCalendrier()
moisActuel.value = moisNom.value[moisNb.value - 1]

/**récupere et associe les représentations à leur dates respectives */
function getCalendrier() {

    fetch(DOMAINE + "calendar.php" + "?year=" + annee.value + "&month=" + moisNb.value).then(Resp => {
        Resp.json().then(data => {
            calendrier.value = data
            nbJours.value = calendrier.value.days
            calendrier.value.days.forEach(jour => {
                shows.value.push(jour.shows)
            });
            unix.value = calendrier.value.days[jourActuel.value - 1].date_unix_time
            getShows()
        })
    })
}

//** récupere les représentations pour une journée précise */
function getShows() {
    fetch(DOMAINE + "shows.php" + "?date_unix_time=" + unix.value).then(Resp => {
        Resp.json().then(data => {
            dailyShows.value = data
        })
    })
}

/** pour sélectionner une journée dans le calendrier */
function select(day, date_unix_time) {
    jourActuel.value = day.date
    unix.value = date_unix_time
    getShows()
}

/** envoie la requete pour payer et réserver les places */
function reserver(id, nbReservations, paypal_payment_id) {

    const form = new FormData()

    form.set("show_id", id)
    form.set("number_of_seats", nbReservations)
    form.set("paypal_payment_id", paypal_payment_id)

    const options = {
        method: "POST",
        body: form,
    }

    fetch(DOMAINE + "book-tickets.php", options).then(Resp => {
        Resp.json().then(data => {
        })
    })
    viderPanier()
}

/** ferme le panier et les messages d'erreur */
function closeAll() {
    setTimeout(function () {
        indisponible.value = null
        message.value = false
    }, 5000)
}

const root = {
    setup() {
        onMounted(function () {
            paypal.Buttons({
                // Sets up the transaction when a payment button is clicked
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: getPanierTotal() // Can also reference a variable or function
                            }
                        }]
                    });
                },
                // Finalize the transaction after payer approval
                onApprove: (data, actions) => {
                    return actions.order.capture().then(function (orderData) {
                        if (orderData.status == 'COMPLETED') {
                            message.value = true
                            setTimeout(function () {
                                panier_est_ouvert.value = false
                            }, 5000)
                            getCalendrier()
                        } else {
                            message.value = undefined
                            closeAll()
                        }
                        produits.value.forEach(element => {
                            reserver(element.id, panier.value[element.id], orderData.id)
                        });
                    });
                }
            }).render('#paypal-button-container');
        })

        return {
            nbJours,
            jourActuel,
            moisActuel,
            moisNb,
            moisNom,
            annee,
            calendrier,
            shows,
            unix,
            dailyShows,
            panier,
            panier_est_ouvert,
            message,
            produits,
            actif,
            indisponible,
            placesRestantes,

            actualisePlaces,
            closeAll,
            getPanierTotal,
            getProduit,
            viderPanier,
            enleverProduit,
            ajouterProduit,
            reserver,
            getShows,
            select,
            getCalendrier,
        }
    }
}

createApp(root).mount("#app")