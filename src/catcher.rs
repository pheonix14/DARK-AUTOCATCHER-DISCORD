use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub async fn query_huggingface(image_url: &str, token: &str, model_id: &str) -> Option<String> {
    let client = Client::new();
    let api_url = format!("https://api-inference.huggingface.co/models/{}", model_id);
    
    // Fetch image bytes
    let img_res = client.get(image_url).send().await.ok()?;
    let img_bytes = img_res.bytes().await.ok()?;

    for _attempt in 0..5 {
        let response = client.post(&api_url)
            .header("Authorization", format!("Bearer {}", token))
            .body(img_bytes.clone())
            .timeout(Duration::from_secs(15))
            .send()
            .await;

        if let Ok(res) = response {
            if let Ok(json) = res.json::<Value>().await {
                if let Some(err_val) = json.get("error") {
                    if let Some(err_str) = err_val.as_str() {
                        if err_str.to_lowercase().contains("loading") {
                            // Model is loading, sleep and retry
                            tokio::time::sleep(Duration::from_secs(4)).await;
                            continue;
                        }
                    }
                }
                
                // Parse top prediction
                if let Some(arr) = json.as_array() {
                    if let Some(first) = arr.first() {
                        if let Some(label) = first.get("label") {
                            if let Some(name) = label.as_str() {
                                return Some(name.replace('_', " ").to_string());
                            }
                        }
                    }
                }
            }
        }
        break;
    }
    None
}

pub fn get_rarity(name: &str) -> &'static str {
    let special_species = [
        "mew", "celebi", "jirachi", "deoxys", "phione", "manaphy", "darkrai", "shaymin", "arceus",
        "victini", "keldeo", "meloetta", "genesect", "diancie", "hoopa", "volcanion", "magearna",
        "marshadow", "zeraora", "meltan", "melmetal", "zarude", "calyrex", "articuno", "zapdos",
        "moltres", "mewtwo", "raikou", "entei", "suicune", "lugia", "ho-oh", "regirock", "regice",
        "registeel", "latias", "latios", "kyogre", "groudon", "rayquaza", "uxie", "mesprit",
        "azelf", "dialga", "palkia", "heatran", "regigigas", "giratina", "cresselia", "cobalion",
        "terrakion", "virizion", "tornadus", "thundurus", "reshiram", "zekrom", "landorus",
        "kyurem", "xerneas", "yveltal", "zygarde", "type: null", "silvally", "tapu koko",
        "tapu lele", "tapu bulu", "tapu fini", "cosmog", "cosmoem", "solgaleo", "lunala",
        "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord",
        "necrozma", "poipole", "naganadel", "stakataka", "blacephalon", "zamazenta", "zacian",
        "eternatus", "kubfu", "urshifu", "regieleki", "regidrago", "glastrier", "spectrier",
        "enamorus"
    ];
    let name_lower = name.to_lowercase();
    if name_lower.contains("shiny") {
        return "SHINY";
    }
    for species in special_species {
        if name_lower.contains(species) {
            return "LEGENDARY";
        }
    }
    "COMMON"
}
