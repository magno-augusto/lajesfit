package com.lajesfit.android.feature.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.BebasNeue
import com.lajesfit.android.ui.theme.LajesFitTheme

// Espelha src/features/profile/SearchPage.tsx: cabecalho "BUSCAR PESSOAS" em
// Bebas, campo de busca e lista de resultados em cards brancos com avatar no
// padrao primary/10 ja usado nas demais telas.

@Composable
fun SearchProfilesScreen(
    onOpenProfile: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SearchProfilesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    SearchProfilesScreenContent(
        uiState = uiState,
        onQueryChange = viewModel::onQueryChange,
        onOpenProfile = onOpenProfile,
        modifier = modifier,
    )
}

@Composable
private fun SearchProfilesScreenContent(
    uiState: SearchProfilesUiState,
    onQueryChange: (String) -> Unit,
    onOpenProfile: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = "BUSCAR PESSOAS",
            fontFamily = BebasNeue,
            fontSize = 28.sp,
        )
        OutlinedTextField(
            value = uiState.query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            label = { Text("Buscar pessoas") },
        )

        uiState.errorMessage?.let { message ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
            ) {
                Text(message, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(14.dp))
            }
        }

        when {
            uiState.isLoading -> {
                Row(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalArrangement = Arrangement.Center) {
                    CircularProgressIndicator()
                }
            }
            !uiState.shouldSearch -> {
                EmptySearchState("Digite pelo menos 2 caracteres.")
            }
            uiState.results.isEmpty() -> {
                EmptySearchState("Nenhum perfil encontrado.")
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(uiState.results, key = { it.id }) { result ->
                        SearchResultRow(
                            result = result,
                            onClick = { onOpenProfile(result.username) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptySearchState(message: String) {
    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
        Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}

@Composable
private fun SearchResultRow(
    result: ProfileSearchResult,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SearchAvatar(result.avatarUrl, result.displayName)
            Column(modifier = Modifier.weight(1f)) {
                Text(result.displayName, style = MaterialTheme.typography.titleSmall)
                Text(
                    "@${result.username}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SearchAvatar(avatarUrl: String?, fallbackName: String) {
    if (avatarUrl != null) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(44.dp).clip(CircleShape),
        )
    } else {
        Box(
            modifier = Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(fallbackName.take(1).uppercase(), color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun SearchProfilesScreenPreview() {
    LajesFitTheme {
        SearchProfilesScreenContent(
            uiState = SearchProfilesUiState(
                query = "ma",
                results = listOf(
                    ProfileSearchResult("u1", "magno", "Magno", null),
                    ProfileSearchResult("u2", "maria", "Maria", null),
                ),
            ),
            onQueryChange = {},
            onOpenProfile = {},
        )
    }
}
