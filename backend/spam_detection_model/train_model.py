import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset
import torch
from datetime import datetime


class TrainModel:
    # Paths relative to backend folder
    DATA_DIR = os.path.join("inputs", "data", "ready")
    MERGED_DATA_PATH = os.path.join(DATA_DIR, "data.csv")
    SAVED_MODEL_DIR = os.path.join("outputs", "models", "distilbert-%s"%datetime.now().strftime("%Y%m%d-%H%M%S"))
    RESULTS_DIR = os.path.join("outputs", "results")
    LOGS_DIR = os.path.join("outputs", "logs")

    def __init__(self, model_name="distilbert-base-uncased", epochs=5, batch_size=16):
        print(f"\n[+] Initializing training for model: {model_name}")
        self.model_name = model_name
        self.epochs = epochs
        self.batch_size = batch_size

        # Ensure necessary directories exist
        for d in [self.DATA_DIR, self.SAVED_MODEL_DIR, self.RESULTS_DIR, self.LOGS_DIR]:
            os.makedirs(d, exist_ok=True)

        self.train_data = None
        self.val_data = None

   

    def load__data(self, file_path=MERGED_DATA_PATH):
        """
        Load the merged dataset CSV, split into train/val sets.
        """
        print(f"\n[+] Loading email data from: {file_path}")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File '{file_path}' does not exist.")

        df = pd.read_csv(file_path, low_memory=False)
        if 'text' not in df.columns or 'label' not in df.columns:
            raise ValueError("CSV file must contain 'text' and 'label' columns.")

        print("[+] Sample data:\n", df.head())
        train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['label'])
        self.train_data = train_df
        self.val_data = val_df


    def train(self):
        """
        Tokenize data, configure training, and run model training using Huggingface Trainer.
        """
        print(f"\n[+] Starting training for {self.model_name} - epochs: {self.epochs}, batch size: {self.batch_size}")

        train_dataset = Dataset.from_pandas(self.train_data)
        val_dataset = Dataset.from_pandas(self.val_data)

        tokenizer = DistilBertTokenizerFast.from_pretrained(self.model_name)
        model = DistilBertForSequenceClassification.from_pretrained(self.model_name)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[+] Using device: {device}")
        model.to(device)

        # Tokenization function
        def tokenize(batch):
            return tokenizer(batch['text'], padding=True, truncation=True)

        train_dataset = train_dataset.map(tokenize, batched=True)
        val_dataset = val_dataset.map(tokenize, batched=True)

        train_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])
        val_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])

        training_args = TrainingArguments(
            output_dir=self.RESULTS_DIR,
            num_train_epochs=self.epochs,
            per_device_train_batch_size=self.batch_size,
            per_device_eval_batch_size=self.batch_size * 2,
            evaluation_strategy='epoch',
            save_strategy='epoch',
            logging_dir=self.LOGS_DIR,
            logging_steps=10,
            load_best_model_at_end=True,
            metric_for_best_model="accuracy",
            save_total_limit=2,
            seed=42,
            # disable_tqdm=False
        )

        def compute_metrics(eval_pred):
            logits, labels = eval_pred
            predictions = logits.argmax(axis=-1)
            precision, recall, f1, _ = precision_recall_fscore_support(labels, predictions, average='binary')
            acc = accuracy_score(labels, predictions)
            return {
                'accuracy': acc,
                'f1': f1,
                'precision': precision,
                'recall': recall
            }

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            compute_metrics=compute_metrics,
        )

        trainer.train()

        print(f"[+] Saving trained model and tokenizer to: {self.SAVED_MODEL_DIR}")
        trainer.save_model(self.SAVED_MODEL_DIR)
        tokenizer.save_pretrained(self.SAVED_MODEL_DIR)

        print("[+] Training complete!")

    def classify_email(self, email_text, model_path=SAVED_MODEL_DIR):
        """
        Classify a single email text as malicious (1) or non-malicious (0).
        """
        tokenizer = DistilBertTokenizerFast.from_pretrained(model_path)
        model = DistilBertForSequenceClassification.from_pretrained(model_path)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()

        inputs = tokenizer(email_text, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predicted_class = torch.argmax(logits, dim=1).item()

        return predicted_class



if __name__ == "__main__":
    train = TrainModel(epochs=5, batch_size=16)
    # To create merged dataset from raw emails (first run only)
    # train.gather_training_data()

    # Load merged dataset from CSV
    #train.load_email_data()

    # Train the model
    #train.train()

    # To test the model on a test dataset CSV
    # test_model_on_dataset()
