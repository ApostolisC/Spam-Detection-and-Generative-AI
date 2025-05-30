import os
import pandas as pd

class PreprocessData:
    def __init__(self):
        self.dataset_path = os.path.join(".\inputs", "data", "raw")
        self.output_path = os.path.join(".\outputs", "data", "ready", "data.csv")
        print(f"\n[+] Initializing data preprocessing with dataset path: {self.dataset_path}")
        # Ensure output directory exists
        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)

    def merge_datasets(self):
        """
        Load raw email datasets (csv or folder with .spam.txt/.ham.txt),
        merge them into a single CSV for training.
        """
        print(f"\n[+] Gathering training data from: {self.dataset_path}")
        if not os.path.exists(self.dataset_path):
            raise FileNotFoundError(f"Dataset path '{self.dataset_path}' does not exist.")

        df = self.load_all_emails(self.dataset_path)
        print("\n[+] Sample data:\n", df.head())

        # Save the merged full dataset for future reuse
        df.to_csv(self.output_path, index=False)
        print(f"\n[+] Merged dataset saved to: {self.output_path}")

    def load_all_emails(self, root_dir):
        """
        Recursively load emails from raw datasets: CSV files or folders with .spam.txt/.ham.txt files.
        """
        print(f"\n[+] Loading all emails from: {root_dir}")
        if not os.path.exists(root_dir):
            raise FileNotFoundError(f"Root directory '{root_dir}' does not exist.")

        data = []

        for dataset_name in os.listdir(root_dir):
            dataset_path = os.path.join(root_dir, dataset_name)
            if not os.path.isdir(dataset_path):
                continue

            print(f"--> Processing dataset: {dataset_name}")

            data.extend(self._load_csv_files(dataset_path))
            data.extend(self._load_emails_from_subfolders(dataset_path))

        if data:
            return pd.concat(data, ignore_index=True)
        else:
            raise ValueError("No email data found in the provided dataset directory.")

    def _load_csv_files(self, dataset_path):
        """
        Helper to load CSV files with 'text' and 'label' columns from a dataset path.
        """
        data = []
        for file in os.listdir(dataset_path):
            if file.endswith('.csv'):
                csv_path = os.path.join(dataset_path, file)
                df = pd.read_csv(csv_path, low_memory=False)
                if 'text' in df.columns and 'label' in df.columns:
                    data.append(df[['text', 'label']])
        return data

    def _load_emails_from_subfolders(self, dataset_path):
        """
        Helper to load emails from subfolders (.spam.txt/.ham.txt files).
        """
        data = []
        for subfolder in os.listdir(dataset_path):
            subfolder_path = os.path.join(dataset_path, subfolder)
            if not os.path.isdir(subfolder_path):
                continue

            for file in os.listdir(subfolder_path):
                file_path = os.path.join(subfolder_path, file)
                if file.endswith('.spam.txt'):
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        data.append(pd.DataFrame([{'text': f.read(), 'label': 1}]))
                elif file.endswith('.ham.txt'):
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        data.append(pd.DataFrame([{'text': f.read(), 'label': 0}]))
        return data
   

    
if __name__ == "__main__":
    process = PreprocessData()
    process.merge_datasets()
