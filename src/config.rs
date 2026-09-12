use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;

pub fn read_config(path: &Path) -> HashMap<String, String> {
    let mut config = HashMap::new();
    if !path.exists() {
        return config;
    }
    if let Ok(file) = File::open(path) {
        let reader = BufReader::new(file);
        for line in reader.lines().flatten() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some((key, val)) = trimmed.split_once('=') {
                config.insert(key.trim().to_string(), val.trim().to_string());
            }
        }
    }
    config
}

pub fn write_config(path: &Path, config: &HashMap<String, String>) -> Result<(), std::io::Error> {
    let mut file = File::create(path)?;
    for (k, v) in config {
        writeln!(file, "{}={}", k, v)?;
    }
    Ok(())
}
