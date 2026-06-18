export function mapPropertyToDTO(p: any) {
  if (!p) return p;
  
  // Extract relational data if populated
  const cityName = p.location?.city?.name || p.city;
  const stateName = p.location?.city?.state?.name || p.state;
  const areaName = p.location?.name || p.area;

  const dto = { ...p };

  // Restore the flat strings expected by frontend/DTOs
  dto.city = cityName;
  dto.state = stateName;
  if (areaName) {
      dto.area = areaName;
  }

  // Eradicate relational keys so frontend doesn't receive complex objects
  delete dto.location;
  delete dto.locationId;

  return dto;
}
